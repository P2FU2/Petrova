import { v4 as uuid } from "uuid";
import type {
  AlertRecord,
  BillRecord,
  ChatMessage,
  LedgerTransaction,
  OnboardingData,
  ParsedTransaction,
  SubscriptionRecord,
  UploadedFileRecord
} from "@/lib/types";

interface StoreState {
  onboarding: OnboardingData;
  files: UploadedFileRecord[];
  stagedTransactions: ParsedTransaction[];
  transactions: LedgerTransaction[];
  alerts: AlertRecord[];
  subscriptions: SubscriptionRecord[];
  bills: BillRecord[];
  chat: ChatMessage[];
}

const state: StoreState = {
  onboarding: {
    completed: false
  },
  files: [],
  stagedTransactions: [],
  transactions: [],
  alerts: [],
  subscriptions: [],
  bills: [],
  chat: []
};

export function getState() {
  return state;
}

export function updateOnboarding(data: Partial<OnboardingData>) {
  state.onboarding = { ...state.onboarding, ...data };
  return state.onboarding;
}

export function addUploadedFile(file: Omit<UploadedFileRecord, "id" | "createdAt">) {
  const created: UploadedFileRecord = {
    id: uuid(),
    createdAt: new Date().toISOString(),
    ...file
  };
  state.files.unshift(created);
  return created;
}

export function updateFile(id: string, patch: Partial<UploadedFileRecord>) {
  const idx = state.files.findIndex((file) => file.id === id);
  if (idx === -1) return null;
  state.files[idx] = { ...state.files[idx], ...patch };
  return state.files[idx];
}

export function getFile(id: string) {
  return state.files.find((file) => file.id === id) ?? null;
}

export function addStagedTransactions(transactions: ParsedTransaction[]) {
  state.stagedTransactions.push(...transactions);
}

export function approveFileTransactions(fileId: string, workspace = "principal") {
  const approved = state.stagedTransactions.filter((tx) => tx.sourceFileId === fileId);
  state.transactions.push(...approved.map((tx) => ({ ...tx, workspace })));
  state.stagedTransactions = state.stagedTransactions.filter((tx) => tx.sourceFileId !== fileId);
  return approved.length;
}

export function listTransactions() {
  return state.transactions;
}

export function addAlert(alert: Omit<AlertRecord, "id" | "createdAt" | "isRead">) {
  const created: AlertRecord = {
    id: uuid(),
    createdAt: new Date().toISOString(),
    isRead: false,
    ...alert
  };
  state.alerts.unshift(created);
  return created;
}

export function listAlerts() {
  return state.alerts;
}

export function markAlertAsRead(id: string) {
  const alert = state.alerts.find((item) => item.id === id);
  if (!alert) return null;
  alert.isRead = true;
  return alert;
}

export function addChatMessage(message: Omit<ChatMessage, "id">) {
  const created: ChatMessage = {
    id: uuid(),
    ...message
  };
  state.chat.push(created);
  return created;
}

export function listChatMessages() {
  return state.chat;
}

export function upsertSubscriptionsFromTransactions(transactions: LedgerTransaction[]) {
  const grouped = new Map<string, { amount: number; dates: string[] }>();
  for (const tx of transactions) {
    if (tx.direction !== "expense") continue;
    const key = (tx.merchant || tx.descriptionClean).toLowerCase();
    if (!grouped.has(key)) grouped.set(key, { amount: 0, dates: [] });
    const item = grouped.get(key)!;
    item.amount += tx.amount;
    item.dates.push(tx.date);
  }

  const recurring = [...grouped.entries()]
    .filter(([, item]) => item.dates.length >= 2)
    .slice(0, 20);

  state.subscriptions = recurring.map(([name, item]) => {
    const sorted = item.dates.sort();
    const last = sorted[sorted.length - 1];
    const monthlyAvg = item.amount / item.dates.length;
    const next = new Date(last);
    next.setMonth(next.getMonth() + 1);

    return {
      id: uuid(),
      name,
      amount: Number(monthlyAvg.toFixed(2)),
      frequency: "mensal",
      lastChargeDate: last,
      nextChargeDate: next.toISOString(),
      isEssential: false
    };
  });

  return state.subscriptions;
}

export function listSubscriptions() {
  return state.subscriptions;
}

export function addBill(data: Omit<BillRecord, "id" | "status">) {
  const due = new Date(data.dueDate);
  const now = new Date();
  const status: BillRecord["status"] = due < now ? "vencido" : "aberto";
  const bill: BillRecord = {
    id: uuid(),
    status,
    ...data
  };
  state.bills.unshift(bill);
  return bill;
}

export function listBills() {
  return state.bills;
}

export function markBillPaid(id: string) {
  const bill = state.bills.find((item) => item.id === id);
  if (!bill) return null;
  bill.status = "pago";
  return bill;
}
