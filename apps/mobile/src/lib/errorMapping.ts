import type { ErrorCode } from "./graphqlClient";

/**
 * Mapeia ErrorCode (02-API-AUTH.md §4.2) -> mensagens PT-BR já prontas para UI,
 * seguindo o tom de voz da marca (branding/02-tone-of-voice.md): humilde,
 * sem drama, nunca expõe stack/debugMessage/caminho interno (claude.md §31).
 */
export function mapErrorCodeToMessage(
  code: ErrorCode | string | undefined,
): string {
  switch (code) {
    case "UNAUTHENTICATED":
      return "Sua sessão expirou. Entre de novo para continuar.";
    case "FORBIDDEN":
      return "Vocês não têm permissão para ver isso.";
    case "NOT_FOUND":
      return "Não encontramos o que você procurava.";
    case "BAD_USER_INPUT":
      return "Alguma informação não ficou certinha — confira os campos.";
    case "RATE_LIMITED":
      return "Muitas tentativas em pouco tempo. Espere um instante e tente de novo.";
    case "MFA_REQUIRED":
      return "Precisamos confirmar seu segundo fator de autenticação.";
    case "CONFLICT":
      return "Isso já foi alterado em outro lugar. Atualize e tente de novo.";
    case "UPSTREAM_ERROR":
      return "Um dos nossos parceiros está fora do ar agora. Seus dados anteriores continuam aqui.";
    case "INTERNAL_ERROR":
    default:
      return "Não deu pra carregar agora. A culpa é da gente, não sua — tente de novo em instantes.";
  }
}
