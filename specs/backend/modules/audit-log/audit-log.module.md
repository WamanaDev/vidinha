# Módulo `audit-log` — Contrato e regras de negócio

**Status:** Sem contrato GraphQL público no MVP (nenhuma query/mutation) e sem código de exemplo ainda — **seguir o padrão de código do módulo `family` em `backend/modules/family/`** para a parte interna (service, testes), adaptado à ausência de resolver. Ver [`../family/family.module.md`](../family/family.module.md) para o exemplo completo e [`../../00-overview.md`](../../00-overview.md) para o índice geral.

---

## 1. Por que não há contrato GraphQL público

`00-DECISIONS.md §9` não define nenhuma query pública de auditoria no MVP. O módulo existe apenas para ser **consumido internamente pelo `AuditLogInterceptor`** (uso interno, Princípio do Menor Privilégio — `CLAUDE.md §29`). Se uma tela de auditoria for necessária no futuro, adicionar `audit-log.resolver.ts` com uma query restrita a `ADMIN` (ex.: `auditLogs(familyId: ID!): [AuditLogEntry!]!`), reaproveitando o mesmo `@CheckAbility()` dos demais módulos.

## 2. Regras de negócio (extraídas de `00-DECISIONS.md §9`)

**Eventos obrigatoriamente auditados** (tabela `AuditLog`, retenção mínima 12 meses):

- Login
- Logout
- Criação/exclusão de família (`FAMILY_CREATED`, ver [`../family/create-family.md`](../family/create-family.md))
- Mudança de papel de membro (`FAMILY_MEMBER_ROLE_CHANGED`, ver [`../family/promote-admin.md`](../family/promote-admin.md))
- Remoção de membro (`FAMILY_MEMBER_REMOVED`, ver [`../family/remove-member.md`](../family/remove-member.md))
- Criação de convite (`FAMILY_INVITE_CREATED`, ver [`../family/invite-member.md`](../family/invite-member.md))
- Conexão/revogação Open Finance (ver [`../open-finance/open-finance.module.md`](../open-finance/open-finance.module.md))
- Mudança de permissão de compartilhamento (ver [`../sharing-permissions/sharing-permissions.module.md`](../sharing-permissions/sharing-permissions.module.md))
- Exclusão de conta de usuário (`requestAccountDeletion`, ver [`../../00-overview.md §5`](../../00-overview.md))

- **Formato do registro:** `actorId`, `familyId` (quando aplicável), `action` (enum `AuditAction`), `metadata` (JSON com detalhes específicos do evento, nunca dados sensíveis brutos como senha/token), timestamp implícito de criação.
- **Retenção mínima: 12 meses** — política de expurgo/arquivamento após esse período não está detalhada; tratar como ponto em aberto para infraestrutura de banco de dados.
- **Nunca logar tokens ou credenciais** em `metadata` — consistente com `CLAUDE.md §31` (tratamento de erros) e `§47` (segurança de segredos) e com o log estruturado do `nestjs-pino` que redige `req.headers.authorization` (ver `app.module.ts` em [`../family/family.module.md §8`](../family/family.module.md)).
- **Login/Logout são eventos do Supabase Auth**, não de uma mutation GraphQL própria do NestJS (ver [`../../common/jwt-auth-guard.md`](../../common/jwt-auth-guard.md)) — capturar esses eventos exige either (a) um webhook do Supabase Auth (`auth.audit_log_entries` ou evento de sessão) chamando um endpoint interno do backend, ou (b) registrar o evento no momento do *just-in-time provisioning*/primeira requisição autenticada. **Suposição a validar:** este ponto não está detalhado em `00-DECISIONS.md` além de listar login/logout como eventos obrigatórios; a escolha exata do mecanismo de captura fica para quando o módulo `auth` for implementado.

## 3. Interceptor de auditoria (`AuditLogInterceptor`)

Registrado globalmente via `APP_INTERCEPTOR` (ver `app.module.ts` completo em [`../family/family.module.md §8`](../family/family.module.md)). Convenção adotada pelos módulos de domínio: cada mutation que corresponde a um evento auditável chama `this.auditLog.record({ actorId, familyId, action, metadata })` diretamente no service, como demonstrado em todas as mutations do módulo `family` (ver `create-family.md`, `invite-member.md`, `remove-member.md`, `promote-admin.md`). O `AuditLogInterceptor`/decorator `@Audit(AuditAction)` mencionado na estrutura de pastas é uma alternativa declarativa (metadata + interceptor) para não exigir a chamada manual em todo service — a escolha entre chamada manual explícita (como em `family`) e o decorator `@Audit()` deve ser consistente em todos os módulos; **recomendação: seguir o padrão manual já demonstrado em `family`**, por ser mais explícito e fácil de auditar via code review.

## 4. Estrutura de arquivos esperada

```text
apps/api/src/modules/audit-log/
├── audit-log.module.ts
├── audit-log.service.ts    # record(): persiste o AuditLog; usado pelo AuditLogInterceptor e diretamente pelos services de domínio
└── audit-log.service.spec.ts
```

## Nota de implementação

Este módulo ainda não tem código de exemplo escrito. Ao implementá-lo, seguir o padrão de `apps/api/src/modules/family/family.service.ts` para o formato de chamada (`auditLog.record({...})`, como já usado em todas as mutations de `family`) e o padrão de `family.service.spec.ts` para os testes unitários — ver [`../family/family.module.md`](../family/family.module.md) e [`../family/remove-member.md §7`](../family/remove-member.md). Implementado por último entre os módulos de domínio (ver ordem em [`../../00-overview.md §3`](../../00-overview.md)), pois o `AuditLogInterceptor`/mapeamento de eventos depende das mutations de todos os módulos anteriores já existirem.
