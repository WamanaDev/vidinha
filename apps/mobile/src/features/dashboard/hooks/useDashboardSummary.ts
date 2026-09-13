import { useMyFamilies } from "@features/family/hooks/useFamily";

// SUPOSIÇÃO: specs/mobile/routes/tabs/home.md descreve um dashboard composto
// por `accounts(familyId)`, `cards(familyId)`, `transactions(...)` e
// `recurringExpenses(familyId)` — nenhuma dessas quatro queries de listagem
// direta existe no SDL real hoje (accounts/cards só existem via
// `openFinanceConnections`, e não há `recurringExpenses` nenhuma). Para não
// inventar chamadas contra queries inexistentes, a v1 do Início usa apenas
// `myFamilies` (real, já usado por `ActiveFamilyProvider`) para mostrar
// nome/famílias do usuário e oferecer atalhos para as outras abas — conforme
// a instrução explícita da tarefa ("não precisa ser sofisticado, é a v1").
// Quando o backend expuser as queries de resumo financeiro, esta função passa
// a compor todas elas.
export function useDashboardSummary() {
  return useMyFamilies();
}
