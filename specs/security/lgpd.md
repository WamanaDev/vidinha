# LGPD aplicado ao Vidinha

> Parte de [Segurança e Compliance — 00-overview.md](./00-overview.md).

**Aviso:** esta seção é uma proposta técnica para orientar a arquitetura. **Não substitui validação jurídica formal**, conforme já sinalizado em `00-DECISIONS.md §10`.

## 1. Mapeamento de dados pessoais e financeiros coletados

| Categoria de dado | Exemplos | Base legal provável | Controlador/Operador |
|---|---|---|---|
| Identificação básica | Nome, e-mail, telefone (opcional) | Execução de contrato (uso do app) | Vidinha = controlador |
| Credenciais/autenticação | Hash de senha, tokens OAuth, status de MFA | Execução de contrato + legítimo interesse (segurança) | Supabase = operador |
| Dados financeiros agregados (Open Finance) | Saldos, transações, limites de cartão, instituição vinculada | Consentimento explícito (fluxo Pluggy Connect) | Pluggy = operador; Vidinha = controlador dos dados recebidos |
| Dados de família/compartilhamento | Estrutura da família, papéis, permissões de compartilhamento, categorias | Execução de contrato | Vidinha = controlador |
| Dados de uso/telemetria | Logs de acesso, eventos de auditoria, erros (Sentry) | Legítimo interesse (segurança, antifraude, suporte) | Vidinha = controlador; Sentry = operador |
| Dados de convite | E-mail/telefone de pessoa convidada (ainda não usuário) | Legítimo interesse / execução de contrato pré-contratual | Vidinha = controlador |

**Dados que o Vidinha explicitamente NÃO coleta/armazena:** PAN completo de cartão, CVV, senha bancária/credenciais de Internet Banking (o consentimento e captura de credenciais ocorrem inteiramente na superfície do Pluggy Connect, fora do app Vidinha).

## 2. Direitos do titular — mutations GraphQL

**`exportMyData`**
- Fluxo: usuário autenticado solicita → job assíncrono compila todos os dados de que é titular (perfil, famílias em que participa — apenas os dados que ele próprio inseriu/possui, não dados privados de outros membros, — permissões de compartilhamento criadas por ele, transações de contas próprias) → gera JSON/CSV → disponibiliza link de download temporário (expira em 72h) enviado por e-mail via Supabase.
- Prazo alvo: processamento em até 15 dias corridos (prazo exato **a confirmar com jurídico** conforme prazos da LGPD para atendimento de requisições).
- Auditoria: evento de exportação registrado em `AuditLog`.

**`requestAccountDeletion`**
- Fluxo: usuário solicita exclusão → confirmação (ex.: reautenticação ou e-mail de confirmação) → conta marcada `PENDING_DELETION` com prazo de carência (ex.: 7 dias para arrependimento, cancelável pelo próprio usuário) → após o prazo, processo de exclusão/anonimização executa.
- **O que é excluído:** credenciais de autenticação (via Supabase Admin API), dados de perfil (nome, e-mail, telefone), conexões Open Finance ativas (revogadas junto ao Pluggy).
- **O que é anonimizado (não excluído fisicamente):** transações e registros que também pertencem a outros membros da família (ex.: uma transação em conta compartilhada visível a outros) — o vínculo com o usuário excluído é substituído por um identificador anônimo, preservando a integridade do histórico compartilhado para os demais membros.
- **O que é retido por obrigação legal, se houver:** registros de `AuditLog` (retenção mínima 12 meses conforme 00-DECISIONS §9) — mantidos mesmo após exclusão de conta, pois auditoria de segurança é interesse legítimo/obrigação, com o `userId` mantido apenas como referência técnica (não usado para outro fim).
- Prazo alvo: conclusão em até 30 dias conforme já definido em 00-DECISIONS §10; anonimização de dados financeiros remanescentes em até 90 dias após desconexão — **ambos os prazos sujeitos a revisão jurídica final**.

## 3. Papel do Vidinha, Pluggy e Supabase

- **Vidinha = Controlador** dos dados pessoais e financeiros dos usuários (define finalidade e meios de tratamento).
- **Pluggy = Operador** (processa dados sob instrução do Vidinha para viabilizar Open Finance) — **requer Data Processing Agreement (DPA)** formal antes de produção, cobrindo: escopo de dados, prazo de retenção do lado do Pluggy, localização de armazenamento, procedimento em caso de incidente, e confirmação de que PAN/CVV nunca trafega pelo Vidinha.
- **Supabase = Operador** (Auth + banco de dados) — **requer DPA/Data Processing Addendum** do Supabase (geralmente disponível nos termos enterprise/pro; validar se o plano Free oferece cobertura equivalente antes de produção com dados reais).
- **Sentry = Operador** (error tracking) — igualmente requer revisão de DPA e configuração para nunca receber PII sensível em payloads de exceção (mascaramento antes de `captureException`, conforme filtro em [error-handling.md](./error-handling.md)).
- **Ação pendente antes de produção:** revisão formal de todos os DPAs listados acima com apoio jurídico — marcado explicitamente como **A DEFINIR** em `00-DECISIONS.md`.
