/** Usuário autenticado, populado no `context.req.user` pelo `JwtAuthGuard`/`SupabaseJwtStrategy`. */
export interface AuthUser {
  userId: string;
  email: string;
  /** Nível de garantia de autenticação do Supabase ('aal1' | 'aal2'). */
  aal: string;
}
