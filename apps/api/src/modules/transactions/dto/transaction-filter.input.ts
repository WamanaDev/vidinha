import { InputType, Field, ID, Float } from "@nestjs/graphql";
import { IsUUID, IsOptional, IsDate, IsNumber } from "class-validator";

@InputType("TransactionFilterInput")
export class TransactionFilterInput {
  @Field(() => ID)
  @IsUUID("4")
  familyId: string;

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

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  fromDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  toDate?: Date;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  maxAmount?: number;
}
