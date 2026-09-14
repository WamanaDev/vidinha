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
 * Edição de transação manual. Só permitido quando `source: MANUAL` e o
 * chamador é o dono (checado no service) — ver
 * `transactions.service.ts#updateManual`.
 *
 * SUPOSIÇÃO: não é possível mover a transação para outra conta/cartão
 * (`accountId`/`cardId` não fazem parte deste input) — a tarefa não pede
 * essa capacidade e permitir a troca exigiria reverter o efeito no saldo da
 * conta/cartão de origem e aplicá-lo ao destino, um caso mais complexo fora
 * do escopo desta implementação. Para "mover" uma transação, o usuário pode
 * excluí-la e recriá-la na conta/cartão correta.
 */
@InputType("UpdateTransactionInput")
export class UpdateTransactionInput {
  @Field(() => ID)
  @IsUUID("4")
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @Field(() => TransactionType, { nullable: true })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID("4")
  categoryId?: string;
}
