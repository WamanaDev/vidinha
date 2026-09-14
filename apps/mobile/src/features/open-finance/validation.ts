import type { ConnectorCredential } from "@features/open-finance/types";

/**
 * Valida um valor de credencial no cliente usando o regex (`validation`) e a
 * mensagem (`validationMessage`) que a própria Pluggy já retorna em PT-BR
 * para cada conector — evita reinventar mensagens de validação
 * (branding/02-tone-of-voice.md, claude.md).
 *
 * Retorna `undefined` quando o valor é válido.
 */
export function validateCredentialValue(
  credential: ConnectorCredential,
  value: string,
): string | undefined {
  if (!credential.optional && value.trim().length === 0) {
    return "Preenche esse campinho pra gente continuar.";
  }

  if (value && credential.validation) {
    try {
      const regex = new RegExp(credential.validation);
      if (!regex.test(value)) {
        return credential.validationMessage ?? "Esse valor não parece certo.";
      }
    } catch {
      // Regex mal formado vindo do provedor — não bloqueia o usuário por
      // causa disso, a validação final de qualquer forma acontece no
      // backend/Pluggy.
      return undefined;
    }
  }

  return undefined;
}
