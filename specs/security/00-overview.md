# Vidinha — Segurança e Compliance (v1)

**Status:** Especificação técnica derivada de `claude.md` (seções 18–53) e `00-DECISIONS.md`.
**Escopo:** Segurança de aplicação (backend NestJS/GraphQL + app React Native/Expo), LGPD, gestão de segredos e resposta a incidentes.
**Regra de consistência:** este documento não contradiz `00-DECISIONS.md`. Onde uma decisão de segurança não estava coberta lá, a opção mais conservadora foi adotada e está listada na seção "Suposições desta spec" (final deste documento).

Este conteúdo foi reestruturado em múltiplos arquivos, listados no índice abaixo, cada um com um resumo de um parágrafo.

---

## Índice

### [asvs-checklist.md](./asvs-checklist.md) — Checklist OWASP ASVS
Checklist completo de requisitos de segurança do backend NestJS, no nível ASVS 2, organizado por categoria (Autenticação, Controle de Acesso, Validação de Entrada, Criptografia, Sessões, API/GraphQL e Configuração/Logging), cada item marcado com prioridade `MVP` ou `Pós-MVP` para orientar o que é obrigatório antes do lançamento.

### [masvs-checklist.md](./masvs-checklist.md) — Checklist OWASP MASVS
Checklist completo de segurança do app mobile Expo/React Native cobrindo as quatro áreas do MASVS (Storage, Crypto, Auth, Network e Resilience), incluindo requisitos como `expo-secure-store` para tokens, certificate/public-key pinning com rotação, PKCE em fluxos OAuth e proteção contra engenharia reversa (Hermes, ProGuard/R8).

### [input-validation.md](./input-validation.md) — Validação de entrada
Estratégia de validação de todo Input GraphQL via `class-validator`/`class-transformer` com `ValidationPipe` global restritivo, ilustrada com dois exemplos completos de DTOs (`CreateFamilyInput` e `CreateSharingPermissionInput`), deixando claro que validação de formato é responsabilidade do DTO e validação de posse/autorização é responsabilidade do service/CASL.

### [error-handling.md](./error-handling.md) — Tratamento de erros seguro
Implementação completa de um `GraphQLExceptionFilter` para NestJS que garante que stack traces, mensagens de SQL/Prisma e detalhes internos nunca cheguem ao cliente, enviando o erro completo para logs/Sentry e devolvendo apenas mensagens genéricas ou códigos de erro de uma allowlist segura.

### [lgpd.md](./lgpd.md) — LGPD
Mapeamento dos dados pessoais e financeiros coletados pelo Vidinha com base legal e papel de controlador/operador de cada parte envolvida (Vidinha, Pluggy, Supabase, Sentry), além dos fluxos técnicos propostos para as mutations `exportMyData` e `requestAccountDeletion`, com aviso explícito de que os prazos e bases legais exigem validação jurídica formal.

### [secrets.md](./secrets.md) — Gestão de segredos (aplicação)
Tabela de menor privilégio para cada segredo de aplicação (chaves do Supabase, credenciais do Pluggy, JWKS, DSN do Sentry, chave de SSL pinning, credenciais do backup), definindo onde cada um vive e quem pode consumi-lo; complementa a estratégia de secrets de CI/CD em `../infra/secrets-management.md`.

### [incident-response.md](./incident-response.md) — Plano de resposta a incidentes
Plano inicial de resposta a incidentes (nível startup/MVP) com passos imediatos de contenção e preservação de evidências, matriz de comunicação (equipe interna, usuários afetados, ANPD, fornecedores) e checklist de pós-incidente, incluindo o aviso de que o prazo de notificação à ANPD ainda precisa de confirmação jurídica.

---

## Suposições desta spec

Pontos não cobertos explicitamente por `00-DECISIONS.md`, resolvidos aqui pela opção mais conservadora:

1. **Nível ASVS de referência:** adotado Nível 2 (não Nível 1 nem 3) por ser o padrão razoável para app com dados financeiros sem ainda ter escala/exposição de Nível 3.
2. **Bloqueio ativo por root/jailbreak:** decidido **não bloquear** no MVP (apenas telemetria), dado o público-alvo (famílias/consumidor final, não app bancário regulado) — reavaliar em v2.
3. **MFA obrigatório (`aal2`) para ações sensíveis:** proposto como Pós-MVP, já que 00-DECISIONS §5 define MFA como opcional no MVP; não tornar nenhuma ação bloqueante por MFA antes de MFA ser mais adotado pelos usuários.
4. **Detecção de scripts/XSS em texto livre:** tratado como requisito MVP mesmo o produto sendo mobile-first sem client web hoje, como defesa em profundidade para quando existir client web (mencionado como possibilidade em `claude.md §39`).
5. **DPA com Supabase no plano Free:** assumido que pode não haver DPA formal equivalente ao plano pago — sinalizado como ação pendente antes de produção com dados reais, não como bloqueio para o desenvolvimento do MVP em si.
6. **Prazo de exportação de dados (`exportMyData`):** proposto 15 dias corridos como valor de trabalho, sem base legal fixada — explicitamente sujeito a validação jurídica, assim como os prazos já sinalizados em `00-DECISIONS.md §10`.
