import { InputType, Field } from "@nestjs/graphql";
import { IsOptional, IsString, IsUrl, Length } from "class-validator";
import { Transform } from "class-transformer";

@InputType()
export class CompleteProfileInput {
  @Field()
  @IsString()
  @Length(1, 120)
  @Transform(({ value }) => value?.trim())
  displayName: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
