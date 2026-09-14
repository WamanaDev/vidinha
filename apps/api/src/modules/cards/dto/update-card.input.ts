import { InputType, Field, ID, Float } from "@nestjs/graphql";
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  Length,
} from "class-validator";

/**
 * Edição de cartão manual. Só permitido quando `Card.isManual === true` e o
 * chamador é o dono (checado no service) — ver `cards.service.ts#updateManual`.
 * SUPOSIÇÃO: `type` não é editável após a criação (mesma convenção de
 * `UpdateAccountInput`).
 */
@InputType("UpdateCardInput")
export class UpdateCardInput {
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
  @MaxLength(30)
  brand?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(4, 4)
  lastFourDigits?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID("4")
  billingAccountId?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  currentInvoice?: number;
}
