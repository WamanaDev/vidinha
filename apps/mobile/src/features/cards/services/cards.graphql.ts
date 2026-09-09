import type { CardSummary } from "@features/cards/types";

// SUPOSIÇÃO IMPORTANTE: diferente de `accounts`, o backend real hoje não
// expõe absolutamente nenhum dado de cartão — não existe `type Card`, nem
// `cards(familyId: ID!)`, nem um `AccountType` de cartão dentro de `Account`
// (packages/graphql-schema/schema.graphql só tem CHECKING/SAVINGS/INVESTMENT/
// OTHER). specs/mobile/routes/tabs/cards.md descreve `cards(familyId: ID!)`,
// mas essa query não existe no SDL implementado — está um passo à frente do
// backend real.
//
// Para não inventar dado nem query inexistente, esta função sempre resolve
// para uma lista vazia: a tela `(tabs)/cards.tsx` sempre renderiza o estado
// `empty` (com uma mensagem explicando que cartões chegam em breve), nunca
// `loading`/`error` de verdade. Quando o backend adicionar suporte a cartão
// (novo type + query dedicada), substituir esta função por uma chamada real
// via `graphqlRequest`, seguindo o mesmo padrão de `accounts.graphql.ts`.
export async function fetchCards(_variables: {
  familyId: string;
}): Promise<{ cards: CardSummary[] }> {
  return { cards: [] };
}
