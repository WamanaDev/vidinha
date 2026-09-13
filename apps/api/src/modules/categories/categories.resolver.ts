import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { AuthUser } from "@common/types/auth-user.type";
import { Category } from "@modules/transactions/entities/category.entity";
import { CategoriesService } from "./categories.service";
import { CreateCategoryInput } from "./dto/create-category.input";
import { UpdateCategoryInput } from "./dto/update-category.input";

/**
 * Resolver "dono" das mutations de `Category` (o type em si é declarado em
 * `@modules/transactions/entities/category.entity` — ver cabeçalho daquele
 * arquivo). Sem `PoliciesGuard`/`@CheckAbility()`: autorização resolvida
 * dentro de `CategoriesService` com queries Prisma explícitas, mesma
 * convenção de `AccountsResolver`.
 */
@Resolver(() => Category)
export class CategoriesResolver {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Query(() => [Category])
  async categories(
    @CurrentUser() user: AuthUser,
    @Args("familyId", { type: () => ID }) familyId: string,
  ): Promise<Category[]> {
    return this.categoriesService.findByFamily(user.userId, familyId);
  }

  @Mutation(() => Category)
  async createCategory(
    @CurrentUser() user: AuthUser,
    @Args("input") input: CreateCategoryInput,
  ): Promise<Category> {
    return this.categoriesService.create(user.userId, input);
  }

  @Mutation(() => Category)
  async updateCategory(
    @CurrentUser() user: AuthUser,
    @Args("input") input: UpdateCategoryInput,
  ): Promise<Category> {
    return this.categoriesService.update(user.userId, input);
  }

  @Mutation(() => Boolean)
  async deleteCategory(
    @CurrentUser() user: AuthUser,
    @Args("id", { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.categoriesService.delete(user.userId, id);
  }
}
