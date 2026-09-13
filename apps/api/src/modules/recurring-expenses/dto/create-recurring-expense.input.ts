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
} from "class-validator";
import { Type } from "class-transformer";

/**
 * SUPOSIÇÃO/divergência: o SDL rascunhado em recurring-expenses.module.md §1
 * usa `nextDueDate` como campo de entrada. O schema Prisma real não tem
 * `nextDueDate` (calculado em runtime, ver entity) nem `sharedWithFamily`
 * (sempre `true`, ver entity) — o input segue os campos reais do model
 * `RecurringExpense` (`dueDay`, `startDate`, `endDate?`).
 */
@InputType("CreateRecurringExpenseInput")
export class CreateRecurringExpenseInput {
  @Field(() => ID)
  @IsUUID("4")
  familyId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  amount: number;

  @Field(() => RecurrenceFrequency)
  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay: number;

  @Field()
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID("4")
  categoryId?: string;
}
