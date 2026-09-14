import { InputType, Field, ID, Float } from "@nestjs/graphql";
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  IsOptional,
  Length,
} from "class-validator";

/**
 * Edição de conta manual. Só permitido quando `Account.isManual === true` e o
 * chamador é o dono (checado no service, nunca aqui) — ver
 * `accounts.service.ts#updateManual`.
 *
 * SUPOSIÇÃO: `type` não é editável após a criação (evita inconsistências em
 * telas/relatórios que já assumiram o tipo original da conta) — a spec não
 * detalha essa regra, adotamos a opção mais simples e conservadora.
 * `balance` pode ser corrigido manualmente (ex.: erro de digitação no saldo
 * inicial de uma "Carteira"), atualizando também `balanceUpdatedAt`.
 */
@InputType("UpdateAccountInput")
export class UpdateAccountInput {
  @Field(() => ID)
  @IsUUID("4")
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  maskedNumber?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  balance?: number;
}
