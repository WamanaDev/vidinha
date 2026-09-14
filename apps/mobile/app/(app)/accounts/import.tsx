import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@components/Button";
import { EmptyState } from "@components/EmptyState";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useCategories } from "@features/categories/hooks/useCategories";
import { useCreateTransaction } from "@features/transactions/hooks/useTransactionActions";
import {
  MAX_IMPORT_ROWS,
  parseTransactionsCsv,
  type CsvRowError,
  type ParsedCsvRow,
} from "@features/transactions/lib/csvImport";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

type Step =
  | { kind: "idle" }
  | { kind: "invalid"; errors: CsvRowError[]; tooManyRows: boolean }
  | { kind: "ready"; rows: ParsedCsvRow[] }
  | { kind: "importing"; total: number; done: number; failed: number }
  | { kind: "done"; total: number; succeeded: number; failed: number };

// Nova tela — import de extrato via CSV (funcionalidade nova desta tarefa).
// Rota `/(app)/accounts/import?accountId=...`, acessada a partir do detalhe
// de uma conta manual (`account/[id].tsx` §"Importar extrato (CSV)").
//
// Fluxo (claude.md — nunca envia dado bruto do arquivo, só os campos já
// parseados/validados; nunca envia nada parcialmente sem o usuário validar
// antes): escolher arquivo -> parsear e validar 100% no client -> mostrar
// erros linha a linha se houver -> só depois confirmar o envio, uma
// `createTransaction` por linha (não existe mutation de import em lote no
// SDL real).
export default function ImportTransactionsScreen() {
  const { accountId } = useLocalSearchParams<{ accountId?: string }>();
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();

  const { data: categoriesData } = useCategories(familyId);
  const createTransaction = useCreateTransaction();

  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [pickError, setPickError] = useState<string | null>(null);

  const handlePickFile = useCallback(async () => {
    setPickError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const parsed = parseTransactionsCsv(content);
      if (parsed.tooManyRows) {
        setStep({ kind: "invalid", errors: [], tooManyRows: true });
        return;
      }
      if (parsed.errors.length > 0) {
        setStep({ kind: "invalid", errors: parsed.errors, tooManyRows: false });
        return;
      }
      setStep({ kind: "ready", rows: parsed.rows });
    } catch {
      setPickError(
        "Não conseguimos ler esse arquivo. Confira se é um CSV válido e tente de novo.",
      );
    }
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (step.kind !== "ready" || !accountId) return;
    const { rows } = step;
    const categories = categoriesData?.categories ?? [];

    setStep({ kind: "importing", total: rows.length, done: 0, failed: 0 });

    let succeeded = 0;
    let failed = 0;

    // Sequencial de propósito: não existe mutation de import em lote no SDL
    // real — chamadas em paralelo demais poderiam disparar rate limiting
    // (claude.md §38) sem necessidade para um import de até 500 linhas.
    for (const row of rows) {
      const matchedCategory = row.categoryName
        ? categories.find(
            (c) => c.name.toLowerCase() === row.categoryName!.toLowerCase(),
          )
        : undefined;

      try {
        await createTransaction.mutateAsync({
          accountId,
          description: row.description,
          amount: Math.abs(row.amount),
          type: row.amount < 0 ? "DEBIT" : "CREDIT",
          occurredAt: new Date(`${row.date}T00:00:00.000Z`).toISOString(),
          categoryId: matchedCategory?.id,
        });
        succeeded += 1;
      } catch {
        failed += 1;
      }
      setStep((prev) =>
        prev.kind === "importing"
          ? { ...prev, done: succeeded + failed, failed }
          : prev,
      );
    }

    setStep({ kind: "done", total: rows.length, succeeded, failed });
  }, [step, accountId, categoriesData, createTransaction]);

  if (!accountId) {
    return (
      <EmptyState
        title="Escolha uma conta primeiro"
        description="Abra o detalhe de uma conta manual e toque em “Importar extrato (CSV)”."
        actionLabel="Voltar para Contas"
        onAction={() => router.replace("/(app)/(tabs)/accounts")}
      />
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg.app }}
      contentContainerStyle={{ padding: space[5] }}
    >
      <Text style={[typeScale.h1, { color: tokens.text.primary }]}>
        Importar extrato
      </Text>
      <Text
        style={[
          typeScale.body,
          { color: tokens.text.secondary, marginTop: space[2] },
        ]}
      >
        O arquivo precisa ser um CSV com as colunas{" "}
        <Text style={{ fontWeight: "600" }}>data</Text> (AAAA-MM-DD),{" "}
        <Text style={{ fontWeight: "600" }}>descricao</Text>,{" "}
        <Text style={{ fontWeight: "600" }}>valor</Text> (negativo = saída,
        positivo = entrada) e, se quiser,{" "}
        <Text style={{ fontWeight: "600" }}>categoria</Text>. Exemplo:{"\n"}
        {"2026-09-01,Mercado,-150.30,Alimentação"}
      </Text>

      <View style={{ marginTop: space[5] }}>
        <Button
          label="Escolher arquivo CSV"
          onPress={handlePickFile}
          variant="secondary"
          fullWidth
        />
        {pickError ? (
          <Text
            style={[
              typeScale.caption,
              { color: tokens.state.error.fg, marginTop: space[2] },
            ]}
          >
            {pickError}
          </Text>
        ) : null}
      </View>

      {step.kind === "invalid" ? (
        <View style={{ marginTop: space[5] }}>
          {step.tooManyRows ? (
            <Text style={[typeScale.body, { color: tokens.state.error.fg }]}>
              {`Esse arquivo tem mais de ${MAX_IMPORT_ROWS} linhas. Divida em arquivos menores e tente de novo.`}
            </Text>
          ) : (
            <>
              <Text
                style={[
                  typeScale.body,
                  { color: tokens.state.error.fg, marginBottom: space[3] },
                ]}
              >
                {`${step.errors.length} linha(s) com problema — corrija o arquivo e escolha de novo:`}
              </Text>
              {step.errors.map((err) => (
                <Text
                  key={err.line}
                  style={[
                    typeScale.caption,
                    { color: tokens.text.secondary, marginBottom: space[1] },
                  ]}
                >
                  {`Linha ${err.line} — ${err.reason}`}
                </Text>
              ))}
            </>
          )}
        </View>
      ) : null}

      {step.kind === "ready" ? (
        <View style={{ marginTop: space[5] }}>
          <Text style={[typeScale.body, { color: tokens.text.primary }]}>
            {`${step.rows.length} lançamento(s) prontos para importar.`}
          </Text>
          <View style={{ marginTop: space[4] }}>
            <Button
              label="Confirmar importação"
              onPress={handleConfirmImport}
              fullWidth
            />
          </View>
        </View>
      ) : null}

      {step.kind === "importing" ? (
        <View style={{ marginTop: space[5] }}>
          <Text style={[typeScale.body, { color: tokens.text.primary }]}>
            {`Importando… ${step.done}/${step.total}`}
          </Text>
        </View>
      ) : null}

      {step.kind === "done" ? (
        <View style={{ marginTop: space[5] }}>
          <Text style={[typeScale.body, { color: tokens.text.primary }]}>
            {step.failed === 0
              ? `Tudo certo! ${step.succeeded} lançamento(s) importado(s).`
              : `${step.succeeded} de ${step.total} lançamento(s) importados. ${step.failed} falharam — você pode tentar de novo só com essas linhas.`}
          </Text>
          <View style={{ marginTop: space[4] }}>
            <Button
              label="Voltar para a conta"
              onPress={() =>
                router.replace(`/(app)/account/${accountId}` as never)
              }
              fullWidth
            />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
