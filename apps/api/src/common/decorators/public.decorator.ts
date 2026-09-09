import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Marca um resolver/handler como isento do `JwtAuthGuard` global (fail-secure por padrão). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
