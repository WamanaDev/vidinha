// `type Card` — SDL real, packages/graphql-schema/schema.graphql (query
// `cards(familyId: ID!): [Card!]!`). Uma versão anterior deste arquivo
// assumia que o backend não tinha nenhum dado de cartão — o SDL implementado
// já expõe o tipo completo.
export type { Card } from "@app-types/graphql-generated";
