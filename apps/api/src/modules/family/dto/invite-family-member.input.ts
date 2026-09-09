import { InputType, Field, ID } from "@nestjs/graphql";
import { IsUUID, IsEmail, MaxLength } from "class-validator";

/**
 * Nome de arquivo/classe interno; o `@InputType` é registrado com o nome
 * `InviteMemberInput` do SDL (fonte da verdade) — ver family.module.md, Suposição.
 */
@InputType("InviteMemberInput")
export class InviteFamilyMemberInput {
  @Field(() => ID)
  @IsUUID("4", { message: "familyId inválido" })
  familyId: string;

  @Field()
  @IsEmail({}, { message: "E-mail inválido" })
  @MaxLength(254)
  email: string;
}
