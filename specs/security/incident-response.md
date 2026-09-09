# Plano de resposta a incidentes (nível inicial / startup em MVP)

> Parte de [Segurança e Compliance — 00-overview.md](./00-overview.md).

**Aviso:** prazo legal exato de notificação à ANPD (Autoridade Nacional de Proteção de Dados) sob a LGPD **deve ser confirmado com jurídico** antes de produção — hoje a LGPD não fixa um prazo numérico rígido como o GDPR (72h), mas exige comunicação "em prazo razoável", o que precisa ser formalizado internamente com apoio jurídico.

## 1. Passos imediatos ao suspeitar de incidente (vazamento de dados ou comprometimento de credenciais)

1. **Conter:** revogar/rotacionar imediatamente a credencial comprometida (Supabase service role key, Pluggy API key, JWT signing — via painel do Supabase/Pluggy). Se a suspeita envolver conta de usuário, forçar `signOut({ scope: 'global' })` para o(s) usuário(s) afetado(s).
2. **Isolar:** se o vetor for uma dependência vulnerável ou endpoint específico, desabilitar a feature/rota (feature flag ou deploy de hotfix) enquanto se investiga.
3. **Preservar evidências:** exportar logs relevantes (Sentry, `nestjs-pino`, `AuditLog`) do período do incidente antes que rotacionem/expirem, para análise posterior.
4. **Avaliar escopo:** identificar quais tabelas/usuários/famílias foram potencialmente afetados, usando `AuditLog` e logs de acesso.

## 2. Comunicação

| Público | Canal | Quando |
|---|---|---|
| Equipe interna (fundador/dev) | Canal direto (ex.: WhatsApp/Slack do time) | Imediatamente ao detectar |
| Usuários afetados | E-mail transacional (via Supabase/serviço de e-mail configurado) | Assim que o escopo estiver minimamente confirmado, com linguagem clara sobre o que ocorreu, quais dados foram afetados e o que fazer (ex.: trocar senha) |
| ANPD | Canal oficial da autoridade, conforme orientação jurídica | Prazo e formato **a confirmar com jurídico**; documentar internamente a data de detecção e a data de notificação para fins de conformidade |
| Fornecedores (Pluggy/Supabase) | Canal de suporte/segurança do fornecedor | Se o incidente envolver ou puder envolver a infraestrutura deles |

## 3. Pós-incidente

- Registrar o incidente em um documento interno (mesmo que simples: markdown/planilha) com linha do tempo, causa raiz, dados afetados, ações tomadas e ações corretivas.
- Atualizar este documento e `00-DECISIONS.md` se o incidente revelar uma lacuna de arquitetura.
- Adicionar teste de regressão (unitário/integração) que cobre a falha específica que permitiu o incidente, quando aplicável.
