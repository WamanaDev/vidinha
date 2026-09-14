import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import { CredentialSelectSheet } from "@features/open-finance/components/CredentialSelectSheet";
import type { ConnectorCredential } from "@features/open-finance/types";

export interface CredentialFieldProps {
  credential: ConnectorCredential;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
}

/**
 * Renderiza o campo certo para uma credencial da Pluggy (`type: text | password
 * | number | image | select`) — formulário de conexão nativa
 * (`open-finance/connect-form`) e tela de MFA (`open-finance/connect-mfa`).
 *
 * Segurança (MASVS-STORAGE): `value`/`onChangeText` vivem só no `useState`
 * da tela que usa este componente — nunca são persistidos aqui nem em
 * nenhuma store. Campos `password` desabilitam autofill do teclado.
 */
export function CredentialField({
  credential,
  value,
  onChangeText,
  error,
}: CredentialFieldProps) {
  const tokens = useTokens();
  const [isSelectVisible, setSelectVisible] = useState(false);

  if (credential.type === "select") {
    const options = credential.options ?? [];
    const selectedLabel =
      options.find((option) => option.value === value)?.label ??
      credential.placeholder ??
      "Selecionar";

    return (
      <View style={{ marginBottom: space[6] }}>
        <Text
          style={[
            typeScale.label,
            { color: tokens.text.secondary, marginBottom: space[1] + 2 },
          ]}
        >
          {credential.label}
        </Text>
        <Button
          label={selectedLabel}
          onPress={() => setSelectVisible(true)}
          variant="secondary"
          fullWidth
        />
        {error ? (
          <Text
            style={[
              typeScale.caption,
              { color: tokens.state.error.fg, marginTop: space[1] + 2 },
            ]}
          >
            {error}
          </Text>
        ) : null}
        <CredentialSelectSheet
          isVisible={isSelectVisible}
          onClose={() => setSelectVisible(false)}
          title={credential.label}
          options={options}
          selected={value}
          onSelect={onChangeText}
        />
      </View>
    );
  }

  // `type: 'image'` é raro na Pluggy (ex.: upload de captcha) e não é
  // prioridade nesta tarefa — tratado como texto simples com um aviso, em vez
  // de um componente de captura de imagem dedicado (SUPOSIÇÃO, ver resumo).
  return (
    <View>
      {credential.type === "image" ? (
        <Text
          style={[
            typeScale.caption,
            { color: tokens.text.secondary, marginBottom: space[1] },
          ]}
        >
          Esse banco pede um código de uma imagem — por enquanto, digite o
          código manualmente aqui.
        </Text>
      ) : null}
      <TextInput
        label={credential.label}
        value={value}
        onChangeText={onChangeText}
        placeholder={credential.placeholder ?? undefined}
        error={error}
        secureTextEntry={credential.type === "password"}
        keyboardType={credential.type === "number" ? "numeric" : "default"}
        autoCapitalize="none"
        autoComplete={credential.type === "password" ? "off" : undefined}
        importantForAutofill={credential.type === "password" ? "no" : undefined}
      />
    </View>
  );
}
