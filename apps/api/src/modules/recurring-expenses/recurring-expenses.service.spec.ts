import { Test } from "@nestjs/testing";
import { RecurringExpensesService } from "./recurring-expenses.service";
import { PrismaService } from "@prisma-module/prisma.service";
import {
  ForbiddenAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import { RecurrenceFrequency } from "@prisma/client";

describe("RecurringExpensesService", () => {
  let service: RecurringExpensesService;
  let prisma: {
    familyMember: { findUnique: jest.Mock };
    recurringExpense: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    category: { findUnique: jest.Mock };
  };

  const familyId = "family-1";
  const creatorId = "creator-1";
  const memberId = "member-1";
  const outsiderId = "outsider-1";

  const family = { id: familyId, name: "Família Teste", createdAt: new Date() };
  const creator = {
    id: creatorId,
    email: "creator@test.com",
    displayName: null,
    avatarUrl: null,
    createdAt: new Date(),
  };

  const baseExpense = {
    id: "expense-1",
    createdById: creatorId,
    familyId,
    categoryId: null,
    name: "Aluguel",
    amount: "1500.00" as unknown as number,
    frequency: RecurrenceFrequency.MONTHLY,
    dueDay: 10,
    startDate: new Date("2024-01-01"),
    endDate: null,
    isActive: true,
    archivedAt: null,
    createdBy: creator,
    family,
    category: null,
  };

  beforeEach(async () => {
    prisma = {
      familyMember: { findUnique: jest.fn() },
      recurringExpense: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      category: { findUnique: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RecurringExpensesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(RecurringExpensesService);
  });

  describe("findByFamily", () => {
    it("qualquer membro ativo da família vê as despesas recorrentes da família", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId: memberId,
        familyId,
        removedAt: null,
      });
      prisma.recurringExpense.findMany.mockResolvedValue([baseExpense]);

      const result = await service.findByFamily(memberId, familyId);

      expect(result).toHaveLength(1);
      expect(result[0].sharedWithFamily).toBe(true);
      expect(result[0].description).toBe("Aluguel");
    });

    it("não-membro não vê nada (lança antes de consultar)", async () => {
      prisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.findByFamily(outsiderId, familyId),
      ).rejects.toBeInstanceOf(NotFoundAppException);
      expect(prisma.recurringExpense.findMany).not.toHaveBeenCalled();
    });
  });

  describe("update/delete", () => {
    it("só o criador pode editar", async () => {
      prisma.recurringExpense.findUnique.mockResolvedValue(baseExpense);

      await expect(
        service.update(memberId, { id: baseExpense.id, description: "Novo" }),
      ).rejects.toBeInstanceOf(ForbiddenAppException);
      expect(prisma.recurringExpense.update).not.toHaveBeenCalled();
    });

    it("o criador pode editar a própria despesa", async () => {
      prisma.recurringExpense.findUnique.mockResolvedValue(baseExpense);
      prisma.recurringExpense.update.mockResolvedValue({
        ...baseExpense,
        name: "Aluguel Novo",
      });

      const result = await service.update(creatorId, {
        id: baseExpense.id,
        description: "Aluguel Novo",
      });

      expect(result.description).toBe("Aluguel Novo");
    });

    it("só o criador pode excluir", async () => {
      prisma.recurringExpense.findUnique.mockResolvedValue(baseExpense);

      await expect(
        service.delete(memberId, baseExpense.id),
      ).rejects.toBeInstanceOf(ForbiddenAppException);
      expect(prisma.recurringExpense.delete).not.toHaveBeenCalled();
    });

    it("o criador pode excluir a própria despesa", async () => {
      prisma.recurringExpense.findUnique.mockResolvedValue(baseExpense);
      prisma.recurringExpense.delete.mockResolvedValue(baseExpense);

      const result = await service.delete(creatorId, baseExpense.id);
      expect(result).toBe(true);
    });

    it("lança NotFoundAppException quando a despesa não existe", async () => {
      prisma.recurringExpense.findUnique.mockResolvedValue(null);

      await expect(
        service.delete(creatorId, "nao-existe"),
      ).rejects.toBeInstanceOf(NotFoundAppException);
    });
  });

  describe("computeNextDueDate", () => {
    it("MONTHLY: retorna a próxima ocorrência do dia no mês atual ou seguinte", () => {
      const now = new Date(2024, 5, 5); // 5 de junho de 2024
      const result = service.computeNextDueDate(
        RecurrenceFrequency.MONTHLY,
        10,
        new Date(2024, 0, 1),
        null,
        now,
      );
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(5); // junho (ainda não passou o dia 10)
      expect(result.getDate()).toBe(10);
    });

    it("MONTHLY: avança para o próximo mês quando o dia já passou", () => {
      const now = new Date(2024, 5, 15); // 15 de junho de 2024
      const result = service.computeNextDueDate(
        RecurrenceFrequency.MONTHLY,
        10,
        new Date(2024, 0, 1),
        null,
        now,
      );
      expect(result.getMonth()).toBe(6); // julho
      expect(result.getDate()).toBe(10);
    });

    it("QUARTERLY: avança em passos de 3 meses a partir do mês de referência", () => {
      const now = new Date(2024, 5, 15); // 15 de junho de 2024
      const result = service.computeNextDueDate(
        RecurrenceFrequency.QUARTERLY,
        10,
        new Date(2024, 0, 10),
        null,
        now,
      );
      // dia 10 de junho já passou -> avança 3 meses a partir de junho -> setembro
      expect(result.getMonth()).toBe(8); // setembro
      expect(result.getDate()).toBe(10);
    });

    it("nunca retorna uma data anterior a startDate", () => {
      const now = new Date(2024, 0, 1);
      const startDate = new Date(2024, 5, 20);
      const result = service.computeNextDueDate(
        RecurrenceFrequency.MONTHLY,
        10,
        startDate,
        null,
        now,
      );
      expect(result.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
    });
  });
});
