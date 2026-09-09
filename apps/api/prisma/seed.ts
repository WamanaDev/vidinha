/**
 * Seed de categorias padrão do sistema (ownerId = null) e catálogo inicial de
 * Institution — ver specs/data-model/00-overview.md §4.1.
 *
 * PENDENTE DE CREDENCIAIS: requer DATABASE_URL real para rodar
 * (`pnpm --filter api exec prisma db seed`). Não executado neste bootstrap —
 * ver resumo final da tarefa.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES: { name: string; icon: string; isIncome: boolean }[] =
  [
    { name: "Moradia", icon: "home", isIncome: false },
    { name: "Alimentação", icon: "utensils", isIncome: false },
    { name: "Transporte", icon: "car", isIncome: false },
    { name: "Saúde", icon: "heart-pulse", isIncome: false },
    { name: "Educação", icon: "book", isIncome: false },
    { name: "Lazer", icon: "party-popper", isIncome: false },
    { name: "Assinaturas", icon: "repeat", isIncome: false },
    { name: "Salário", icon: "wallet", isIncome: true },
    { name: "Outros", icon: "ellipsis", isIncome: false },
  ];

async function main() {
  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: {
        ownerId_name: {
          ownerId: null as unknown as string,
          name: category.name,
        },
      },
      update: {},
      create: { ...category, ownerId: null },
    });
  }
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
