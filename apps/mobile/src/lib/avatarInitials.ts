// Helper compartilhado para derivar `fallbackInitials` de `displayName`,
// consumido por qualquer tela/componente que precise montar o prop
// `fallbackInitials` do `Avatar` (specs/mobile/design-system/avatar.md —
// "derivado de displayName sempre que uri for nulo/falhar o load").
// Fica fora de `@components/Avatar` porque o Avatar em si não conhece
// `displayName` (recebe só o resultado já calculado).
export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}
