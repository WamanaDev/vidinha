import { FamilyResolver } from "./family.resolver";
import { FamilyService } from "./family.service";
import { FamilyRole } from "@prisma/client";

// Instanciado diretamente (sem Test.createTestingModule) para não precisar
// montar o grafo de DI do PoliciesGuard/AbilityFactory aplicado a nível de
// classe via @UseGuards — este é um teste unitário do resolver, não um teste
// de integração de guards.
describe("FamilyResolver", () => {
  let resolver: FamilyResolver;
  let service: { createFamily: jest.Mock; findMyFamilies: jest.Mock };

  beforeEach(() => {
    service = {
      createFamily: jest.fn(),
      findMyFamilies: jest.fn(),
    };

    resolver = new FamilyResolver(service as unknown as FamilyService);
  });

  it("createFamily delega ao service e envelopa a resposta em FamilyPayload", async () => {
    const family = {
      id: "family-1",
      name: "Teste",
      createdAt: new Date(),
      members: [],
      myRole: FamilyRole.ADMIN,
    };
    service.createFamily.mockResolvedValue(family);

    const result = await resolver.createFamily(
      { userId: "user-1", email: "a@a.com", aal: "aal1" },
      {
        name: "Teste",
      },
    );

    expect(service.createFamily).toHaveBeenCalledWith("user-1", {
      name: "Teste",
    });
    expect(result).toEqual({ family });
  });

  it("myFamilies delega ao service", async () => {
    service.findMyFamilies.mockResolvedValue([]);

    const result = await resolver.myFamilies({
      userId: "user-1",
      email: "a@a.com",
      aal: "aal1",
    });

    expect(service.findMyFamilies).toHaveBeenCalledWith("user-1");
    expect(result).toEqual([]);
  });
});
