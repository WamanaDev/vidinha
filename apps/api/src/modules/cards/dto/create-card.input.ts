import { InputType, Field, ID, Float } from "@nestjs/graphql";
import { CardType } from "@prisma/client";
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsOptional,
  IsNumber,
  Length,
} from "class-validator";

/**
 * Cadastro manual de cartão (sem Open Finance). Espelha
 * `CreateAccountInput` — ver `accounts/dto/create-account.input.ts`.
 * `familyId` só serve para checar que o chamador é membro ativo.
 */
@InputType("CreateCardInput")
export class CreateCardInput {
  @Field(() => ID)
  @IsUUID("4")
  familyId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @Field(() => CardType)
  @IsEnum(CardType)
  type: CardType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  brand?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(4, 4)
  lastFourDigits?: string;

  /**
   * Conta de fatura/débito vinculada, opcional. Se informada, precisa
   * pertencer ao mesmo usuário (checado no service).
   */
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID("4")
  billingAccountId?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  /** Fatura/saldo inicial do cartão manual (padrão 0 se omitido). */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  currentInvoice?: number;
}
