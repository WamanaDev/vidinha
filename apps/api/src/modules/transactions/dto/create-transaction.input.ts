import { InputType, Field, ID, Float } from "@nestjs/graphql";
import { TransactionType } from "@prisma/client";
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsNumber,
  IsPositive,
  IsOptional,
  IsDate,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * Lançamento manual de transação. Exatamente um entre `accountId`/`cardId`
 * deve ser informado (XOR validado em `TransactionsService#createManual`,
 * não aqui — a checagem cruza dois campos opcionais, mais simples de
 * expressar como regra de negócio no service do que com um validator
 * customizado de class-validator).
 */
@InputType("CreateTransactionInput")
export class CreateTransactionInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID("4")
  accountId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID("4")
  cardId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID("4")
  categoryId?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  amount: number;

  @Field(() => TransactionType)
  @IsEnum(TransactionType)
  type: TransactionType;

  @Field()
  @Type(() => Date)
  @IsDate()
  occurredAt: Date;
}
