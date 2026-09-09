# Validação de entrada — `class-validator`/`class-transformer` nos Inputs GraphQL

> Parte de [Segurança e Compliance — 00-overview.md](./00-overview.md).

Estratégia: todo `@InputType()` é uma classe decorada com `class-validator`; o `ValidationPipe` global do NestJS (`app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, forbidUnknownValues: true }))`) rejeita qualquer campo não declarado ou fora de formato antes de chegar ao resolver/service.

## Exemplo 1 — `CreateFamilyInput`

```typescript
import { InputType, Field } from '@nestjs/graphql';
import {
  IsString,
  Length,
  Matches,
  IsOptional,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

@InputType()
export class CreateFamilyInput {
  @Field()
  @IsString()
  @Length(2, 60, { message: 'Nome da família deve ter entre 2 e 60 caracteres' })
  @Transform(({ value }) => value?.trim())
  @Matches(/^[\p{L}\p{N}\s\-'.]+$/u, {
    message: 'Nome da família contém caracteres inválidos',
  })
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['COUPLE', 'FAMILY', 'ROOMMATES'], {
    message: 'Tipo de família inválido',
  })
  familyType?: string;
}
```

## Exemplo 2 — `CreateSharingPermissionInput`

```typescript
import { InputType, Field, ID } from '@nestjs/graphql';
import {
  IsUUID,
  IsEnum,
  IsBoolean,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export enum SharingResourceType {
  ACCOUNT = 'ACCOUNT',
  CARD = 'CARD',
  CATEGORY = 'CATEGORY',
}

export enum SharingVisibility {
  CONSOLIDATED = 'CONSOLIDATED', // só totais
  FULL_DETAIL = 'FULL_DETAIL',   // extrato transação a transação
}

@InputType()
export class CreateSharingPermissionInput {
  @Field(() => ID)
  @IsUUID('4', { message: 'familyId inválido' })
  familyId: string;

  @Field(() => SharingResourceType)
  @IsEnum(SharingResourceType)
  resourceType: SharingResourceType;

  @Field(() => ID)
  @IsUUID('4', { message: 'resourceId inválido' })
  resourceId: string; // accountId, cardId ou categoryId — validado contra posse no service, não aqui

  @Field(() => SharingVisibility)
  @IsEnum(SharingVisibility)
  visibility: SharingVisibility;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  hiddenFromFamilyByDefault?: boolean;

  // Exemplo de validação condicional: só faz sentido se resourceType = CATEGORY
  @Field({ nullable: true })
  @ValidateIf((o) => o.resourceType === SharingResourceType.CATEGORY)
  @IsBoolean()
  applyToFutureTransactions?: boolean;
}
```

**Importante:** a validação de *formato* (UUID, enum, tamanho) é responsabilidade do DTO/`class-validator`. A validação de *posse/autorização* (o `resourceId` realmente pertence ao usuário autenticado, o `familyId` realmente inclui o usuário) é responsabilidade do **service/CASL**, nunca do DTO — evita confundir validação de entrada com controle de acesso (ver [asvs-checklist.md](./asvs-checklist.md), seção 2 — Controle de acesso).
