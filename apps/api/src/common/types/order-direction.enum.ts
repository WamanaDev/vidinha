import { registerEnumType } from "@nestjs/graphql";

/**
 * Direção de ordenação genérica, reutilizável por qualquer módulo com
 * paginação/ordenação (ver specs/backend/00-overview.md §4). Primeiro
 * consumidor: `TransactionOrderInput` (transactions.module.md §1).
 */
export enum OrderDirection {
  ASC = "ASC",
  DESC = "DESC",
}

registerEnumType(OrderDirection, { name: "OrderDirection" });
