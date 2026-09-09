/**
 * Teste de integração (Supertest contra o schema GraphQL real, 00-DECISIONS.md §8).
 *
 * SUPOSIÇÃO / PENDÊNCIA: este teste depende de um banco Postgres real
 * (DATABASE_URL) e de migrations aplicadas (`prisma migrate deploy`), que ainda
 * não existem neste bootstrap — ver resumo final da tarefa. Mantido como
 * `describe.skip` até que as credenciais de um banco de teste estejam
 * disponíveis; a estrutura de arquivo já segue specs/backend/00-overview.md.
 */
describe.skip("Family (e2e)", () => {
  it("createFamily cria a família com o usuário autenticado como ADMIN", () => {
    // TODO: bootstrap do AppModule real + supertest contra /graphql, uma vez
    // que DATABASE_URL de um banco de teste esteja configurado em CI.
  });
});
