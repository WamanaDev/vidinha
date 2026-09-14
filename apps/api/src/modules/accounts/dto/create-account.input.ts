import { InputType, Field, ID, Float } from "@nestjs/graphql";
import { AccountType } from "@prisma/client";
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsNumber,
  IsOptional,
  Length,
} from "class-validator";

/**
 * Cadastro manual de conta (sem Open Finance) — ver
 * specs/backend/modules/accounts/accounts.module.md §1 (mutations manuais).
 * `familyId` é usado apenas para checar que o usuário é membro ativo da
 * família (mesma convenção de `CreateRecurringExpenseInput`); a conta em si
 * pertence ao usuário (`ownerId`), não à família diretamente.
 */
@InputType("CreateAccountInput")
export class CreateAccountInput {
  @Field(() => ID)
  @IsUUID("4")
  familyId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @Field(() => AccountType)
  @IsEnum(AccountType)
  type: AccountType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  maskedNumber?: string;

  /** Saldo inicial da conta manual. */
  @Field(() => Float)
  @IsNumber()
  balance: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
