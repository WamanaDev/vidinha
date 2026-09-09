/**
 * Gera o SDL GraphQL a partir dos resolvers code-first (@nestjs/graphql) sem
 * precisar subir a aplicação completa (evita exigir uma conexão real de banco
 * apenas para exportar o schema). Usa `GraphQLSchemaBuilderModule`, utilitário
 * oficial do Nest para este cenário (CLI/CI schema snapshot).
 *
 * Uso: ts-node -r tsconfig-paths/register scripts/generate-schema.ts
 *
 * Ver specs/backend/00-overview.md §6 — o SDL gerado é commitado em
 * packages/graphql-schema/schema.graphql (fonte única, compartilhada com
 * apps/mobile via packages/graphql-types).
 */
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from "@nestjs/graphql";
import { printSchema } from "graphql";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { AuthResolver } from "../src/auth/auth.resolver";
import { FamilyResolver } from "../src/modules/family/family.resolver";

async function generate() {
  const app = await NestFactory.create(GraphQLSchemaBuilderModule);
  await app.init();

  const schemaFactory = app.get(GraphQLSchemaFactory);
  const schema = await schemaFactory.create([AuthResolver, FamilyResolver]);

  const outPath = resolve(
    __dirname,
    "../../../packages/graphql-schema/schema.graphql",
  );
  const header = [
    "# Vidinha — SDL GraphQL (fonte única)",
    "#",
    "# GERADO AUTOMATICAMENTE a partir do código code-first de apps/api",
    "# (@nestjs/graphql) via `pnpm --filter api run schema:generate`.",
    "# NÃO editar manualmente — qualquer alteração deve ser feita nos",
    "# resolvers/entities/dto de apps/api/src e regerada.",
    "#",
    "# Fonte única do contrato GraphQL entre apps/api e apps/mobile — ver",
    "# specs/backend/00-overview.md §6 (versionamento do schema).",
    "",
    "",
  ].join("\n");

  writeFileSync(outPath, header + printSchema(schema));
  await app.close();
  // eslint-disable-next-line no-console
  console.log(`Schema gerado em ${outPath}`);
}

generate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
