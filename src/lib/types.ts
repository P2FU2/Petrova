export type FamiliarityLevel = "basico" | "intermediario" | "avancado";
export type StartMode = "upload" | "integracao" | "manual" | "conversa";
export type FileStatus = "uploaded" | "processing" | "parsed" | "needs_review" | "approved" | "failed";
export type Direction = "income" | "expense" | "transfer";

export interface OnboardingData {
  preferredName?: string;
  objective?: string;
  useType?: "pf" | "familia" | "pj" | "holding";
  startMode?: StartMode;
  familiarity?: FamiliarityLevel;
  completed: boolean;
}

export interface ParsedTransaction {
  id: string;
  date: string;
  descriptionRaw: string;
  descriptionClean: string;
  amount: number;
  direction: Direction;
  category: string;
  merchant?: string;
  confidenceScore: number;
  isRecurring: boolean;
  isSubscription: boolean;
  isInternalTransfer: boolean;
  needsReview: boolean;
  sourceFileId: string;
}

export interface UploadedFileRecord {
  id: string;
  filename: string;
  mimeType: string;
  status: FileStatus;
  documentType: string;
  periodStart?: string;
  periodEnd?: string;
  parsedTransactions: ParsedTransaction[];
  createdAt: string;
}

export interface LedgerTransaction extends ParsedTransaction {
  workspace: string;
}

export interface AlertRecord {
  id: string;
  type: string;
  title: string;
  description: string;
  isRead: boolean;
  createdAt: string;
}

export interface SubscriptionRecord {
  id: string;
  name: string;
  amount: number;
  frequency: "mensal" | "semanal" | "anual";
  lastChargeDate?: string;
  nextChargeDate?: string;
  isEssential: boolean;
}

export interface BillRecord {
  id: string;
  beneficiary: string;
  amount: number;
  dueDate: string;
  status: "aberto" | "pago" | "vencido";
  barcode?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  chart?: {
    type: "pie" | "line" | "bar";
    title: string;
    data: Array<{ name: string; value: number }>;
  };
}
