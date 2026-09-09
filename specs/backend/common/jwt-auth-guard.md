# Common — Validação JWT/JWKS do Supabase

**Extraído de:** `specs/02-API-AUTH.md §1` (Autenticação end-to-end) e `§1.8` (validação do JWT). Ver [`../00-overview.md`](../00-overview.md) para o índice completo.

---

## 1. Princípio geral

O **Supabase Auth** é a única fonte de verdade para identidade, emissão e ciclo de vida de tokens. O **NestJS nunca emite, assina ou renova tokens** — ele atua exclusivamente como *resource server*, validando o JWT recebido em cada requisição GraphQL contra o JWKS público do projeto Supabase. Isso evita duplicar lógica de autenticação e mantém o backend sem estado de sessão.

```text
┌─────────────┐        ┌───────────────────┐        ┌──────────────────┐
│  App Expo    │        │  Supabase Auth     │        │  NestJS API       │
│  (RN + TS)   │        │  (identidade +     │        │  (resource server)│
│              │        │   emissão de JWT)  │        │                    │
└──────┬───────┘        └─────────┬──────────┘        └─────────┬─────────┘
       │  1. signUp/signIn/OAuth        │                             │
       │───────────────────────────────>│                             │
       │  2. access_token (JWT) +        │                             │
       │     refresh_token               │                             │
       │<───────────────────────────────│                             │
       │  3. grava em Expo SecureStore   │                             │
       │                                 │                             │
       │  4. GraphQL request                                            │
       │  Authorization: Bearer <access_token>                          │
       │─────────────────────────────────────────────────────────────>│
       │                                 │  5. valida assinatura via    │
       │                                 │     JWKS (cache local)       │
       │                                 │<──────────────────────────  │
       │  6. resposta (200) ou erro UNAUTHENTICATED                     │
       │<─────────────────────────────────────────────────────────────│
```

## 2. Cadastro (sign up)

1. App chama `supabase.auth.signUp({ email, password })` diretamente contra o Supabase (não passa pelo NestJS).
2. Supabase envia e-mail de confirmação (se `confirm email` estiver habilitado no projeto — **decisão: habilitado no MVP**, ver suposições em `../00-overview.md`).
3. Após confirmação, o app chama a mutation GraphQL `completeUserProfile(input: CompleteProfileInput!)` no NestJS para criar o registro correspondente na tabela local `User` (Prisma), vinculado ao `sub` (UUID) do Supabase. Esse é o único ponto em que o NestJS "enxerga" um novo usuário — via *just-in-time provisioning* no primeiro request autenticado, e não via webhook do Supabase (evita dependência de infraestrutura extra de webhook no MVP).
4. Alternativa/reforço: um `AuthGuard` genérico faz *upsert* do usuário local (`id`, `email`, `createdAt`) na primeira requisição autenticada válida, caso `completeUserProfile` não tenha sido chamado (proteção contra fluxo incompleto no app).

## 3. Login (email/senha)

1. App chama `supabase.auth.signInWithPassword({ email, password })`.
2. Supabase retorna `session { access_token, refresh_token, expires_in, user }`.
3. App grava `access_token` e `refresh_token` no **Expo SecureStore** (nunca AsyncStorage).
4. App usa `access_token` como `Authorization: Bearer` em todas as chamadas GraphQL subsequentes.

## 4. Login social (Google / Apple)

1. App inicia `supabase.auth.signInWithOAuth({ provider, redirectTo })` usando **Expo `AuthSession`** com **PKCE** (`code_challenge`/`code_verifier` gerados no dispositivo).
2. Navegador in-app (Expo `WebBrowser.openAuthSessionAsync`) abre o provedor (Google/Apple).
3. Após consentimento, o provedor redireciona para o *redirect URI* do app (`vidinha://auth/callback`) com um `code`.
4. App troca o `code` + `code_verifier` pelo `session` via `supabase.auth.exchangeCodeForSession(code)`.
5. Daí em diante, fluxo idêntico ao login por senha (passos 3-4 da seção 3).
6. Apple Sign-In é obrigatório sempre que Google/outro login social estiver disponível no build iOS (exigência da App Store), conforme já registrado em `00-DECISIONS.md`.

## 5. Refresh de token

- Gerenciado **inteiramente pelo Supabase JS SDK** (`autoRefreshToken: true`), que roda em background enquanto o app está em foreground e renova o `access_token` usando o `refresh_token` antes da expiração (~1h).
- O NestJS **não implementa endpoint de refresh** — se um `access_token` expirado chegar, o resolver retorna erro `UNAUTHENTICATED` (ver `../common/exception-filter.md`) e o app deve deixar o SDK renovar e reenviar a requisição (retry automático no client Apollo/urql via `authLink`/`errorLink`).
- Rotação de refresh token: comportamento padrão do Supabase (refresh token rotativo, o antigo é invalidado ao ser trocado pelo novo).

## 6. Logout

- `supabase.auth.signOut({ scope: 'local' })` para logout do dispositivo atual.
- `supabase.auth.signOut({ scope: 'global' })` para logout de todas as sessões (usado, por exemplo, em "sair de todos os dispositivos" nas configurações de segurança, ou automaticamente ao suspeitar de comprometimento de conta).
- App limpa o Expo SecureStore após o logout, independentemente da resposta do Supabase (fail-safe local).

## 7. MFA (TOTP)

- Opcional no MVP, via **Supabase Auth MFA** (`supabase.auth.mfa.enroll({ factorType: 'totp' })`).
- Fluxo: `enroll` → app exibe QR code → usuário confirma com `challengeAndVerify` → fator ativado.
- Login subsequente com MFA ativo: `signInWithPassword`/`signInWithOAuth` retorna uma sessão com `aal: 'aal1'` (nível 1); o app detecta a necessidade de segundo fator (`getAuthenticatorAssuranceLevel`) e solicita o código TOTP via `mfa.challengeAndVerify`, elevando a sessão para `aal2`.
- O NestJS pode exigir `aal2` em operações sensíveis (ex.: revogar conexão Open Finance, excluir família) checando a claim `aal` do JWT — ver `../common/casl-ability-factory.md §4` (step-up de segurança / QoAS leve).

## 8. Validação do JWT no NestJS (sem duplicar emissão)

Implementação como um `AuthGuard` global (`@nestjs/passport` com estratégia customizada, ou guard nativo do NestJS) aplicado a todos os resolvers GraphQL, exceto os marcados `@Public()`:

```typescript
// auth/strategies/supabase-jwt.strategy.ts
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Cache do JWKS em memória (jwks-rsa já faz cache + rate limit de fetch)
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        cacheMaxAge: 10 * 60 * 1000, // 10 min
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${config.get('SUPABASE_URL')}/auth/v1/.well-known/jwks.json`,
      }),
      algorithms: ['RS256'], // ou ES256, conforme config do projeto Supabase
      issuer: `${config.get('SUPABASE_URL')}/auth/v1`,
      audience: 'authenticated',
      ignoreExpiration: false, // token expirado => erro automático de validação
    });
  }

  async validate(payload: SupabaseJwtPayload) {
    // payload.sub = UUID do usuário no Supabase (== id local, chave primária compartilhada)
    // payload.aal = nível de MFA ('aal1' | 'aal2')
    // payload.email, payload.role (sempre 'authenticated' para usuários finais)
    if (!payload.sub) throw new UnauthorizedException();
    return {
      userId: payload.sub,
      email: payload.email,
      aal: payload.aal ?? 'aal1',
    };
  }
}
```

Pontos-chave:

- **JWKS** é buscado do endpoint público do Supabase (`/auth/v1/.well-known/jwks.json`) e cacheado (10 min) para evitar round-trip a cada requisição — mitiga latência de cold start em serverless.
- **Claims verificadas:** assinatura (`RS256`/`ES256`), `exp` (expiração), `iss` (issuer = projeto Supabase), `aud` (`authenticated`).
- **Token expirado:** a biblioteca `passport-jwt` lança erro na fase de verificação antes mesmo de `validate()` rodar; o `JwtAuthGuard` traduz isso em `GraphQLError` com `extensions.code = 'UNAUTHENTICATED'` (ver `../common/exception-filter.md`), nunca vazando detalhes de biblioteca/stack.
- **Sem verificação de revogação em tempo real:** como o Supabase não expõe uma *denylist* de JWTs revogados por padrão, um `access_token` continua válido até expirar mesmo após logout global — isso é aceitável dado o TTL curto (~1h). Ações de alto impacto (ex.: exclusão de conta, remoção de família) podem opcionalmente checar `session` ainda ativa via `supabase.auth.admin.getUserById` quando o custo de uma revogação tardia for inaceitável.
- **Contexto GraphQL:** o resultado de `validate()` é anexado a `context.user` e fica disponível para todos os resolvers/guards CASL subsequentes.

## 9. `JwtAuthGuard` global

Registrado globalmente via `APP_GUARD` (ver `../modules/family/family.module.md` para o `app.module.ts` completo com a ordem de providers). Ele é fail-secure por padrão: só é contornado por `@Public()`.

```typescript
// apps/api/src/common/guards/jwt-auth.guard.ts
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('supabase-jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  getRequest(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    return gqlCtx.getContext().req;
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true; // fail secure por padrão; @Public() é a única forma de abrir exceção (A3 de 04-SECURITY-COMPLIANCE.md)
    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException(); // traduzido para extensions.code = UNAUTHENTICATED pelo GraphQLExceptionFilter
    }
    return user;
  }
}
```

O `req.user` populado por este guard (via `SupabaseJwtStrategy.validate()` acima) é o que `@CurrentUser()` extrai em todos os resolvers de domínio.

---

**Nota:** este documento cobre apenas a camada de autenticação (quem é o usuário). A camada de autorização (RBAC + ABAC, o que o usuário pode fazer) está em [`casl-ability-factory.md`](./casl-ability-factory.md).
