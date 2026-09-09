import { ObjectType, Field } from "@nestjs/graphql";

/** Ver specs/backend/00-overview.md §5 — direito de portabilidade (LGPD). */
@ObjectType()
export class DataExportPayload {
  @Field()
  downloadUrl: string;

  @Field()
  expiresAt: Date;
}
