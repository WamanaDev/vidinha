# Entidade: `Institution`

> Parte de [../00-overview.md](../00-overview.md) · Schema completo em [../schema.prisma](../schema.prisma)

## 1. Trecho do Schema Prisma

```prisma
/// Instituição financeira conhecida via catálogo de "connectors" do Pluggy.
model Institution {
  id                String   @id @default(uuid())
  pluggyConnectorId Int      @unique
  name              String
  imageUrl          String?
  primaryColor      String?
  type              String   // ex.: "PERSONAL_BANK", "BUSINESS_BANK", "INVESTMENT" (enum livre do Pluggy)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  connections OpenFinanceConnection[]

  @@index([name])
}
```

## 2. Explicação dos Campos

| Campo | Tipo | Explicação |
|---|---|---|
| `id` | `String` (PK, `uuid()`) | Identificador único interno da instituição no Vidinha. |
| `pluggyConnectorId` | `Int` único | Identificador do "connector" no catálogo do Pluggy — chave de correlação com o provedor de Open Finance. |
| `name` | `String` | Nome da instituição financeira (ex.: "Banco do Brasil", "Nubank"). |
| `imageUrl` | `String?` | URL do logo da instituição, para exibição na UI. |
| `primaryColor` | `String?` | Cor de marca da instituição, para theming da UI (ex.: cartão/conta exibidos com a cor do banco). |
| `type` | `String` | Tipo de instituição, string livre refletindo o enum do Pluggy (ex.: `"PERSONAL_BANK"`, `"BUSINESS_BANK"`, `"INVESTMENT"`) — não modelado como enum fechado do Prisma porque é definido pelo provedor externo. |
| `createdAt` | `DateTime` | Data de criação do registro local. |
| `updatedAt` | `DateTime` | Atualizado automaticamente a cada sincronização do catálogo. |

## 3. Relações

- `connections` → [open-finance-connection.md](open-finance-connection.md): todas as conexões Open Finance (itens Pluggy) estabelecidas com esta instituição, por qualquer usuário.

## 4. Regras de Negócio

- É um catálogo, não um dado pertencente a um usuário específico — não tem `ownerId` nem soft-delete próprio (ver seção 5.4 do documento original: "`Transaction`, `Category` (do sistema) e `Institution` não têm soft-delete próprio porque nunca são removidas diretamente pelo usuário nesta versão do modelo").
- O catálogo é sincronizado periodicamente com o catálogo de connectors do Pluggy via job — não apenas no seed inicial (ver seção 4.1 de [../00-overview.md](../00-overview.md), estratégia de migração/seeds).
- `type` é deliberadamente uma `String` livre, e não um enum fechado do Prisma, porque os valores são definidos pelo provedor externo (Pluggy) e podem mudar sem exigir uma migration no schema do Vidinha.

## 5. Justificativa de Modelagem

Não há uma subseção dedicada a `Institution` na seção de justificativas do documento original, mas seu desenho decorre diretamente da decisão de usar o Pluggy como agregador de Open Finance (ver seção 4 do `claude.md` e as decisões correlatas): a entidade existe como catálogo local para permitir joins e exibição de branding sem round-trip à API do Pluggy a cada consulta, ao mesmo tempo que reflete fielmente a estrutura de "connectors" do provedor externo (campo `type` livre, `pluggyConnectorId` como chave de correlação).
