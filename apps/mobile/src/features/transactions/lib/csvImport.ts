// Parser de CSV escrito à mão para o template FIXO de import de extrato
// (apps/mobile/app/(app)/accounts/import.tsx): colunas `data`, `descricao`,
// `valor`, `categoria` (opcional), nessa ordem ou em qualquer ordem desde que
// o cabeçalho bata com esses nomes.
//
// SUPOSIÇÃO: não há biblioteca de parse de CSV já instalada no projeto
// (apps/mobile/package.json) e nenhuma opção leve compatível com Expo/RN sem
// módulos nativos foi encontrada disponível no ecossistema já usado aqui —
// como o template é fixo e simples (sem campos com quebras de linha internas),
// um parser manual é suficiente e evita adicionar uma dependência nova só
// para isso (claude.md §17). Suporta campos entre aspas duplas com vírgula
// escapada (`"valor, com vírgula"`) mas não quebras de linha dentro de um
// campo.

export const MAX_IMPORT_ROWS = 500;

export interface ParsedCsvRow {
  line: number; // 1-based, contando a linha do cabeçalho como 1
  date: string; // AAAA-MM-DD
  description: string;
  amount: number; // negativo = saída (DEBIT), positivo = entrada (CREDIT)
  categoryName?: string;
}

export interface CsvRowError {
  line: number;
  reason: string;
}

export interface CsvParseResult {
  rows: ParsedCsvRow[];
  errors: CsvRowError[];
  tooManyRows: boolean;
}

const REQUIRED_COLUMNS = ["data", "descricao", "valor"] as const;

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

// Faixa Unicode dos diacríticos combinantes (U+0300-U+036F), usada para
// remover acentos após normalizar em NFD (ex.: "descrição" -> "descricao").
const COMBINING_DIACRITICS_REGEX = /[\u0300-\u036f]/g;

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS_REGEX, "");
}

/** Valida se uma string é uma data no formato AAAA-MM-DD e representa uma data real. */
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Parseia número aceitando tanto "1234.56" quanto "1234,56". */
function parseAmount(value: string): number | null {
  if (!value.trim()) return null;
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  // Se não tinha vírgula, o replace de "." acima pode ter destruído o
  // separador decimal (ex.: "10.50") — tenta o valor original primeiro.
  const direct = Number(value.trim());
  if (!Number.isNaN(direct)) return direct;
  const alt = Number(normalized);
  return Number.isNaN(alt) ? null : alt;
}

export function parseTransactionsCsv(content: string): CsvParseResult {
  const lines = content
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return {
      rows: [],
      errors: [{ line: 1, reason: "Arquivo vazio" }],
      tooManyRows: false,
    };
  }

  const header = splitCsvLine(lines[0] ?? "").map(normalizeHeader);
  const missing = REQUIRED_COLUMNS.filter((col) => !header.includes(col));
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          reason: `Cabeçalho precisa ter as colunas: data, descricao, valor (opcional: categoria). Faltando: ${missing.join(", ")}.`,
        },
      ],
      tooManyRows: false,
    };
  }

  const dataRows = lines.slice(1);
  const tooManyRows = dataRows.length > MAX_IMPORT_ROWS;
  const rowsToProcess = tooManyRows ? [] : dataRows;

  const dateIdx = header.indexOf("data");
  const descIdx = header.indexOf("descricao");
  const amountIdx = header.indexOf("valor");
  const categoryIdx = header.indexOf("categoria");

  const rows: ParsedCsvRow[] = [];
  const errors: CsvRowError[] = [];

  rowsToProcess.forEach((rawLine, index) => {
    const lineNumber = index + 2; // +1 pelo cabeçalho, +1 por ser 1-based
    const fields = splitCsvLine(rawLine);

    const dateValue = (fields[dateIdx] ?? "").trim();
    const descValue = (fields[descIdx] ?? "").trim();
    const amountValue = (fields[amountIdx] ?? "").trim();
    const categoryValue =
      categoryIdx >= 0 ? (fields[categoryIdx] ?? "").trim() : "";

    if (!isValidDate(dateValue)) {
      errors.push({
        line: lineNumber,
        reason: `Data inválida ("${dateValue || "vazio"}") — use o formato AAAA-MM-DD.`,
      });
      return;
    }
    if (!descValue) {
      errors.push({ line: lineNumber, reason: "Descrição vazia." });
      return;
    }
    const amount = parseAmount(amountValue);
    if (amount === null || amount === 0) {
      errors.push({
        line: lineNumber,
        reason: `Valor inválido ("${amountValue || "vazio"}") — use um número diferente de zero (negativo = saída, positivo = entrada).`,
      });
      return;
    }

    rows.push({
      line: lineNumber,
      date: dateValue,
      description: descValue,
      amount,
      categoryName: categoryValue || undefined,
    });
  });

  return { rows, errors, tooManyRows };
}
