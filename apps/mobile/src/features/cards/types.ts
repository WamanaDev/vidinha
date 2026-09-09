// SUPOSIÇÃO: o SDL real (packages/graphql-schema/schema.graphql) não define
// nenhum `type Card` nem `AccountType.CARD` — o único tipo de recurso
// financeiro existente hoje é `Account` (via `OpenFinanceConnection.accounts`),
// com `AccountType` restrito a CHECKING/SAVINGS/INVESTMENT/OTHER. Não há,
// portanto, nenhum dado real de "cartão" para popular esta feature ainda.
// Mantido como tipo mínimo só para a tela compilar e sinalizar a ausência ao
// time de backend — ver services/cards.graphql.ts.
export interface CardSummary {
  id: string;
  name: string;
  institutionName: string;
  institutionLogoUrl?: string | null;
}
