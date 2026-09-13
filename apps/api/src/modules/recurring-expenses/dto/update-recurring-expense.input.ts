import { InputType, Field, ID, Float, Int } from "@nestjs/graphql";
import { RecurrenceFrequency } from "@prisma/client";
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDate,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";

@InputType("UpdateRecurringExpenseInput")
export class UpdateRecurringExpenseInput {
  @Field(() => ID)
  @IsUUID("4")
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @Field(() => RecurrenceFrequency, { nullable: true })
  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  frequency?: RecurrenceFrequency;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID("4")
  categoryId?: string;

  // SUPOSIÇÃO: `isActive` não está no SDL rascunhado, mas é a única forma de
  // "desativar" uma despesa recorrente no model Prisma real (não há campo de
  // arquivamento exposto no contrato) — exposto de forma conservadora como
  // opcional para permitir pausar/retomar sem excluir.
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
