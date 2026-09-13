import { GraphQLScalarType, Kind } from "graphql";
import { BadUserInputAppException } from "@common/errors/app.exceptions";

/**
 * SUPOSIÇÃO: o SDL do contrato de `transactions` (transactions.module.md §1)
 * usa `Cursor!` como escalar de paginação sem definir sua codificação.
 * Implementamos como uma string opaca em base64 — o cliente nunca deve
 * inspecionar seu conteúdo, apenas repassá-la de volta em `after`. Definido
 * aqui (não dentro do módulo `transactions`) para ser reutilizável por
 * qualquer módulo futuro que precise de paginação cursor-based estilo Relay
 * (ver specs/backend/00-overview.md §4).
 *
 * Implementado como uma instância de `GraphQLScalarType` (não uma classe
 * decorada com `@Scalar()`), o mesmo padrão usado por `graphql-type-json`:
 * o schema builder code-first do NestJS aceita uma instância de
 * `GraphQLScalarType` diretamente como valor de retorno de um type-function
 * (`@Field(() => GraphQLCursor)`), sem precisar registrá-la como provider.
 * Ver uso em `entities/transaction-edge.entity.ts` e no resolver
 * (`@Args("after", { type: () => GraphQLCursor })`).
 */
export const GraphQLCursor = new GraphQLScalarType({
  name: "Cursor",
  description: "Cursor opaco (base64) para paginação estilo Relay.",
  serialize(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadUserInputAppException("Cursor inválido.");
    }
    return value;
  },
  parseValue(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadUserInputAppException("Cursor inválido.");
    }
    return value;
  },
  parseLiteral(ast): string {
    if (ast.kind !== Kind.STRING) {
      throw new BadUserInputAppException("Cursor inválido.");
    }
    return ast.value;
  },
});

/**
 * Codifica/decodifica o cursor opaco: `<valorDeOrdenacaoSerializado>|<id>`
 * em base64. `value` é a representação em string do campo de ordenação
 * corrente (ISO 8601 para `occurredAt`, string numérica para `amount`) — o
 * `id` desempata registros com o mesmo valor de ordenação, garantindo uma
 * chave de paginação estável (ver transactions.service.ts).
 */
export function encodeCursor(value: string, id: string): string {
  return Buffer.from(`${value}|${id}`, "utf-8").toString("base64");
}

export interface DecodedCursor {
  value: string;
  id: string;
}

export function decodeCursor(cursor: string): DecodedCursor {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const sepIndex = decoded.lastIndexOf("|");
    if (sepIndex <= 0 || sepIndex === decoded.length - 1) {
      throw new Error("formato inválido");
    }
    return {
      value: decoded.slice(0, sepIndex),
      id: decoded.slice(sepIndex + 1),
    };
  } catch {
    throw new BadUserInputAppException("Cursor inválido.");
  }
}
