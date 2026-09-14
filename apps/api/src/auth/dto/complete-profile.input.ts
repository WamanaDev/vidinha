import { InputType, Field } from "@nestjs/graphql";
import { IsOptional, IsString, Length, Matches } from "class-validator";
import { Transform } from "class-transformer";

// Formato exato do path retornado por `createAvatarUploadUrl` (ver
// AuthService#createAvatarUploadUrl): `<userId>/avatar.<jpg|jpeg|png|webp>`.
// A extensão é sempre minúscula (derivada da allowlist de mimeType), mas
// aceitamos `jpg`/`jpeg` para cobrir os dois nomes usuais de extensão JPEG.
const AVATAR_PATH_PATTERN = /^[a-f0-9-]+\/avatar\.(jpg|jpeg|png|webp)$/;

@InputType()
export class CompleteProfileInput {
  @Field()
  @IsString()
  @Length(1, 120)
  @Transform(({ value }) => value?.trim())
  displayName: string;

  /**
   * NOVO CONTRATO (ver apps/api/src/modules/storage): não é mais uma URL
   * arbitrária colada pelo client. É o `path` retornado por
   * `createAvatarUploadUrl`, depois de o client ter feito o `PUT` do arquivo
   * direto no Supabase Storage. `AuthService#completeProfile` valida, além
   * do formato aqui, que o path pertence ao usuário autenticado (prefixo
   * `<userId>/`) antes de persistir — nunca confiar apenas nesta regex.
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(AVATAR_PATH_PATTERN, {
    message:
      "avatarPath inválido. Utilize o path retornado por createAvatarUploadUrl.",
  })
  avatarPath?: string;
}
