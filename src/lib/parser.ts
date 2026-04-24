import { v4 as uuid } from "uuid";
import * as XLSX from "xlsx";
import pdfParse from "pdf-parse";
import type { Direction, ParsedTransaction } from "@/lib/types";

const CATEGORY_RULES: Array<{ category: string; keywords: string[]; recurring?: boolean }> = [
  { category: "assinaturas", keywords: ["netflix", "spotify", "icloud", "google", "microsoft", "amazon prime"], recurring: true },
  { category: "alimentacao", keywords: ["ifood", "restaurante", "padaria", "lanchonete", "mercado"] },
  { category: "transporte", keywords: ["uber", "99", "combustivel", "estacionamento"] },
  { category: "moradia", keywords: ["aluguel", "condominio", "energia", "agua", "internet"] },
  { category: "saude", keywords: ["farmacia", "hospital", "clinica", "plano de saude"] },
  { category: "investimentos", keywords: ["tesouro", "cdb", "fii", "acoes", "corretora"] }
];

function parseAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function detectDirection(amount: number, description: string): Direction {
  const desc = description.toLowerCase();
  if (desc.includes("transferencia entre contas")) return "transfer";
  if (amount >= 0) return "income";
  return "expense";
}

function classify(description: string) {
  const normalized = description.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return {
        category: rule.category,
        isSubscription: rule.category === "assinaturas",
        isRecurring: Boolean(rule.recurring)
      };
    }
  }
  return {
    category: "outros",
    isSubscription: false,
    isRecurring: false
  };
}

function cleanDescription(raw: string) {
  return raw.replace(/\s+/g, " ").trim();
}

export async function parseFileToTransactions(file: File, sourceFileId: string): Promise<ParsedTransaction[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return parseBufferToTransactions(buffer, file.name, file.type, sourceFileId);
}

export async function parseBufferToTransactions(
  buffer: Buffer,
  filenameRaw: string,
  mimeType: string,
  sourceFileId: string
): Promise<ParsedTransaction[]> {
  const filename = filenameRaw.toLowerCase();

  if (filename.endsWith(".csv")) {
    const content = buffer.toString("utf-8");
    return parseCsv(content, sourceFileId);
  }

  if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
    return parseExcel(buffer, sourceFileId);
  }

  if (filename.endsWith(".pdf")) {
    return parsePdf(buffer, sourceFileId);
  }

  if (mimeType.startsWith("image/") || filename.endsWith(".png") || filename.endsWith(".jpg") || filename.endsWith(".jpeg") || filename.endsWith(".webp")) {
    return parseImageWithOcr(buffer, sourceFileId);
  }

  return [];
}

function parseCsv(content: string, sourceFileId: string): ParsedTransaction[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((item) => item.trim().toLowerCase());
  const dateIdx = headers.findIndex((h) => ["date", "data"].includes(h));
  const descIdx = headers.findIndex((h) => ["description", "descricao", "historico"].includes(h));
  const amountIdx = headers.findIndex((h) => ["amount", "valor"].includes(h));

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const rawDescription = String(cols[descIdx] ?? "Transacao");
    const amount = parseAmount(cols[amountIdx]);
    const direction = detectDirection(amount, rawDescription);
    const cls = classify(rawDescription);
    const clean = cleanDescription(rawDescription);

    return {
      id: uuid(),
      date: new Date(String(cols[dateIdx] ?? new Date().toISOString())).toISOString(),
      descriptionRaw: rawDescription,
      descriptionClean: clean,
      amount: Math.abs(amount),
      direction,
      category: cls.category,
      merchant: clean.split(" ")[0],
      confidenceScore: cls.category === "outros" ? 0.58 : 0.94,
      isRecurring: cls.isRecurring,
      isSubscription: cls.isSubscription,
      isInternalTransfer: clean.toLowerCase().includes("transferencia entre contas"),
      needsReview: cls.category === "outros",
      sourceFileId
    };
  });
}

function parseExcel(buffer: Buffer, sourceFileId: string): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const first = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(first, { defval: "" });

  return rows.map((row) => {
    const rawDescription = String(row.description || row.descricao || row.historico || "Transacao");
    const amount = parseAmount(row.amount ?? row.valor ?? 0);
    const direction = detectDirection(amount, rawDescription);
    const cls = classify(rawDescription);
    const clean = cleanDescription(rawDescription);
    const dateRaw = String(row.date || row.data || new Date().toISOString());

    return {
      id: uuid(),
      date: new Date(dateRaw).toISOString(),
      descriptionRaw: rawDescription,
      descriptionClean: clean,
      amount: Math.abs(amount),
      direction,
      category: cls.category,
      merchant: clean.split(" ")[0],
      confidenceScore: cls.category === "outros" ? 0.58 : 0.94,
      isRecurring: cls.isRecurring,
      isSubscription: cls.isSubscription,
      isInternalTransfer: clean.toLowerCase().includes("transferencia entre contas"),
      needsReview: cls.category === "outros",
      sourceFileId
    };
  });
}

async function parsePdf(buffer: Buffer, sourceFileId: string): Promise<ParsedTransaction[]> {
  const parsed = await pdfParse(buffer);
  const lines = parsed.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const txs: ParsedTransaction[] = [];
  const datePattern = /(\d{2}\/\d{2}\/\d{4})/;
  const amountPattern = /(-?\d{1,3}(?:\.\d{3})*,\d{2})/g;

  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    const amounts = line.match(amountPattern);
    if (!dateMatch || !amounts || amounts.length === 0) continue;

    const amount = parseAmount(amounts[amounts.length - 1]);
    const rawDescription = line.replace(dateMatch[0], "").replace(amounts[amounts.length - 1], "").trim() || "Transacao PDF";
    const direction = detectDirection(amount, rawDescription);
    const cls = classify(rawDescription);
    const clean = cleanDescription(rawDescription);

    txs.push({
      id: uuid(),
      date: new Date(dateMatch[0].split("/").reverse().join("-")).toISOString(),
      descriptionRaw: rawDescription,
      descriptionClean: clean,
      amount: Math.abs(amount),
      direction,
      category: cls.category,
      merchant: clean.split(" ")[0],
      confidenceScore: cls.category === "outros" ? 0.52 : 0.86,
      isRecurring: cls.isRecurring,
      isSubscription: cls.isSubscription,
      isInternalTransfer: clean.toLowerCase().includes("transferencia entre contas"),
      needsReview: true,
      sourceFileId
    });
  }

  return txs;
}

async function parseImageWithOcr(buffer: Buffer, sourceFileId: string): Promise<ParsedTransaction[]> {
  try {
    const Tesseract = await import("tesseract.js");
    const result = await Tesseract.recognize(buffer, "por");
    const lines = result.data.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const syntheticCsv = ["date,description,amount"];
    for (const line of lines.slice(0, 60)) {
      const amountMatch = line.match(/(-?\d{1,3}(?:\.\d{3})*,\d{2})/);
      if (!amountMatch) continue;
      const today = new Date().toISOString().slice(0, 10);
      const desc = line.replace(amountMatch[0], "").trim().replace(/,/g, " ");
      syntheticCsv.push(`${today},${desc || "Lancamento OCR"},${amountMatch[0]}`);
    }
    return parseCsv(syntheticCsv.join("\n"), sourceFileId);
  } catch {
    return [];
  }
}

export function detectDocumentType(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.includes("fatura")) return "credit_card_statement";
  if (lower.includes("boleto")) return "bill";
  if (lower.includes("informe")) return "tax_report";
  if (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "bank_statement";
  if (lower.endsWith(".pdf")) return "bank_statement";
  return "unknown";
}
