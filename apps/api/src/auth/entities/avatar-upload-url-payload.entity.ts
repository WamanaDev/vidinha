import { ObjectType, Field } from "@nestjs/graphql";

/**
 * Retorno de `createAvatarUploadUrl` (ver `auth.resolver.ts`). `uploadUrl` é
 * a URL de upload assinada, completa e pronta para o client fazer um `PUT`
 * direto no Supabase Storage com o binário da imagem. `path` é o valor que o
 * client deve reenviar em `completeUserProfile.input.avatarPath` depois de
 * concluir o upload.
 */
@ObjectType()
export class AvatarUploadUrlPayload {
  @Field()
  uploadUrl: string;

  @Field()
  path: string;
}
