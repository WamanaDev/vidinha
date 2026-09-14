# Upload de arquivos — foto de perfil (avatar)

> Parte de [Segurança e Compliance — 00-overview.md](./00-overview.md).

Documenta o único fluxo de upload de arquivo existente hoje no Vidinha: a foto de perfil (`User.avatarUrl`), implementado via Supabase Storage. Qualquer novo tipo de upload (ex.: comprovantes anexados a uma transação, futuramente) deve seguir as mesmas regras descritas aqui, adaptando bucket/allowlist conforme o caso.

## 1. Bucket

- Nome: `avatars`.
- Visibilidade: **privado** (`public: false`) — nunca público, nunca com URL permanente/fixa.
- `file_size_limit`: 5MB (5.242.880 bytes), garantido pela configuração do bucket no Supabase, não apenas no client.
- `allowed_mime_types`: `image/jpeg`, `image/png`, `image/webp` — mesma allowlist replicada no backend (`AuthService`/`SupabaseStorageService`), nunca confiar apenas na configuração do bucket.

## 2. Fluxo (3 passos)

1. **Solicitar upload:** o client autenticado chama `createAvatarUploadUrl(mimeType: String!): AvatarUploadUrlPayload!`. O backend valida `mimeType` contra a allowlist, monta o `path` como `<userId>/avatar.<extensão>` (sempre prefixado pelo `userId` do usuário autenticado extraído do JWT — nunca informado pelo client) e retorna `{ uploadUrl, path }`. `uploadUrl` é uma URL de upload assinada de curta duração, gerada sob demanda a cada chamada (nunca cacheada/reutilizada — o token do Supabase Storage tem validade curta, na prática observada ~2h, mas não documentada formalmente pelo provedor).
2. **Upload direto:** o client faz um `PUT` do binário da imagem direto para `uploadUrl`, com o `Content-Type` correspondente ao `mimeType` declarado. O backend não intermedia o binário — apenas a URL assinada.
3. **Confirmar o path:** o client chama `completeUserProfile(input: { displayName, avatarPath })` enviando o `path` retornado no passo 1. O backend valida (de novo, no service — nunca confia só na regex do DTO) que `avatarPath` começa com `<userId>/`, rejeitando com `BadUserInputAppException` qualquer path de outro usuário. Se havia um avatar anterior com path diferente, o backend tenta excluí-lo do Storage em best-effort (nunca falha a mutation por causa disso — só loga um warning).

## 3. Leitura (URLs assinadas de curta duração)

- `User.avatarUrl` no banco de dados armazena apenas o **path** (`<userId>/avatar.<ext>`), nunca uma URL.
- Toda vez que `avatarUrl` de um `User` é serializado para o GraphQL (em `me`, `completeUserProfile`, membros de família, convites, `owner` de contas/cartões/transações/despesas recorrentes/permissões de compartilhamento), o backend computa uma **signed READ URL** sob demanda via `SupabaseStorageService#createReadUrl`, válida por 1h (`expiresIn: 3600`). Essa URL nunca é persistida nem cacheada — é recalculada a cada resposta.
- Qualquer membro ativo da mesma família de um usuário também pode visualizar sua foto de perfil (decisão de produto confirmada): isso é uma consequência natural de `avatarUrl` já ser exposto hoje em todos esses contextos — não é uma nova regra de autorização, apenas a troca da implementação de "retornar uma URL fixa" para "computar uma signed URL sob demanda".

## 4. Regras de segurança (resumo)

| Regra                                                                 | Onde é garantida                                                                                                                        |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Tamanho máximo 5MB                                                    | Configuração do bucket no Supabase Storage                                                                                              |
| Tipos permitidos: JPEG, PNG, WEBP                                     | Configuração do bucket + allowlist replicada em `AuthService#createAvatarUploadUrl`                                                     |
| Bucket privado, nunca público                                         | Configuração do bucket (`public: false`)                                                                                                |
| URLs de leitura sempre assinadas, curta duração (1h)                  | `SupabaseStorageService#createReadUrl`, chamado sob demanda em toda serialização de `avatarUrl`                                         |
| URLs de upload sempre assinadas, geradas sob demanda, nunca cacheadas | `SupabaseStorageService#createUploadUrl`, chamado a cada `createAvatarUploadUrl`                                                        |
| Path sempre prefixado pelo `userId` do dono                           | Montado pelo backend em `createAvatarUploadUrl` (nunca aceito do client) e revalidado em `completeUserProfile` antes de persistir       |
| `SUPABASE_SERVICE_ROLE_KEY` nunca exposta ao client                   | Usada apenas em `SupabaseStorageService`, lida via `ConfigService` no backend; nunca logada                                             |
| Erros do Storage nunca vazam detalhe interno                          | `SupabaseStorageService` converte qualquer falha de rede/resposta em `UpstreamErrorAppException`, mesmo padrão de `PluggyClientService` |

## 5. SUPOSIÇÕES

- TTL do token de upload assinado do Supabase Storage não é documentado formalmente pelo provedor — tratado como curta duração (gerar sob demanda a cada chamada, nunca cachear), mesma abordagem conservadora já usada para a API key do Pluggy (`PLUGGY_CLIENT_ID`/`PLUGGY_CLIENT_SECRET`, ver `pluggy-client.service.ts`).
- Exclusão do avatar antigo ao trocar de foto é **best-effort**: se falhar, a mutation `completeUserProfile` ainda é bem-sucedida (o novo avatar já está salvo) e a falha é apenas logada — evita deixar o usuário travado por uma falha secundária de limpeza.
