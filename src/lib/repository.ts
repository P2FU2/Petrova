import { FileStatus, Prisma } from "@prisma/client";
import { v4 as uuid } from "uuid";
import type { AuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ParsedTransaction } from "@/lib/types";

export async function getOnboarding(context: AuthContext) {
  const profile = await prisma.profile.findUnique({
    where: { userId: context.userId }
  });

  if (!profile) {
    const created = await prisma.profile.create({
      data: { userId: context.userId, onboardingDone: false }
    });
    return mapProfile(created);
  }
  return mapProfile(profile);
}

export async function updateOnboarding(context: AuthContext, data: Record<string, string>) {
  const profile = await prisma.profile.upsert({
    where: { userId: context.userId },
    update: {
      preferredName: data.preferredName,
      objective: data.objective,
      useType: data.useType,
      startMode: data.startMode,
      familiarityLevel: data.familiarity
    },
    create: {
      userId: context.userId,
      preferredName: data.preferredName,
      objective: data.objective,
      useType: data.useType,
      startMode: data.startMode,
      familiarityLevel: data.familiarity,
      onboardingDone: false
    }
  });
  return mapProfile(profile);
}

export async function completeOnboarding(context: AuthContext) {
  const profile = await prisma.profile.upsert({
    where: { userId: context.userId },
    update: { onboardingDone: true },
    create: { userId: context.userId, onboardingDone: true }
  });
  return mapProfile(profile);
}

function mapProfile(profile: {
  preferredName: string | null;
  objective: string | null;
  useType: string | null;
  startMode: string | null;
  familiarityLevel: string | null;
  onboardingDone: boolean;
}) {
  return {
    preferredName: profile.preferredName ?? undefined,
    objective: profile.objective ?? undefined,
    useType: profile.useType ?? undefined,
    startMode: profile.startMode ?? undefined,
    familiarity: profile.familiarityLevel ?? undefined,
    completed: profile.onboardingDone
  };
}

export async function createUploadedFile(context: AuthContext, data: { filename: string; mimeType: string; documentType: string; blobBase64: string }) {
  return prisma.uploadedFile.create({
    data: {
      workspaceId: context.workspaceId,
      filename: data.filename,
      mimeType: data.mimeType,
      documentType: data.documentType,
      blobBase64: data.blobBase64,
      status: FileStatus.uploaded
    }
  });
}

export async function listFiles(context: AuthContext) {
  const files = await prisma.uploadedFile.findMany({
    where: { workspaceId: context.workspaceId },
    orderBy: { createdAt: "desc" },
    include: { transactions: true }
  });

  return files.map((file) => ({
    id: file.id,
    filename: file.filename,
    mimeType: file.mimeType,
    status: file.status,
    documentType: file.documentType ?? "unknown",
    periodStart: file.periodStart?.toISOString(),
    periodEnd: file.periodEnd?.toISOString(),
    createdAt: file.createdAt.toISOString(),
    parsedTransactions: file.transactions.map((tx) => mapTx(tx, context.workspaceId))
  }));
}

export async function getFile(context: AuthContext, id: string) {
  return prisma.uploadedFile.findFirst({
    where: { id, workspaceId: context.workspaceId },
    include: { transactions: true }
  });
}

export async function setFileStatus(context: AuthContext, id: string, status: FileStatus, periodStart?: string, periodEnd?: string) {
  return prisma.uploadedFile.updateMany({
    where: { id, workspaceId: context.workspaceId },
    data: {
      status,
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined
    }
  });
}

export async function storeParsedTransactions(context: AuthContext, fileId: string, parsed: ParsedTransaction[]) {
  if (!parsed.length) return 0;
  await prisma.transaction.createMany({
    data: parsed.map((tx) => ({
      id: tx.id || uuid(),
      workspaceId: context.workspaceId,
      uploadedFileId: fileId,
      date: new Date(tx.date),
      descriptionRaw: tx.descriptionRaw,
      descriptionClean: tx.descriptionClean,
      amount: new Prisma.Decimal(tx.amount),
      direction: tx.direction,
      institution: null,
      merchant: tx.merchant,
      categoryName: tx.category,
      confidenceScore: tx.confidenceScore,
      isRecurring: tx.isRecurring,
      isSubscription: tx.isSubscription,
      isInternalTransfer: tx.isInternalTransfer,
      needsReview: true
    }))
  });
  return parsed.length;
}

export async function approveFileTransactions(context: AuthContext, fileId: string) {
  const updated = await prisma.transaction.updateMany({
    where: { workspaceId: context.workspaceId, uploadedFileId: fileId },
    data: { needsReview: false }
  });
  await prisma.uploadedFile.updateMany({
    where: { id: fileId, workspaceId: context.workspaceId },
    data: { status: FileStatus.approved }
  });
  return updated.count;
}

export async function listTransactions(context: AuthContext, includeStaged = false) {
  const items = await prisma.transaction.findMany({
    where: {
      workspaceId: context.workspaceId,
      ...(includeStaged ? {} : { needsReview: false })
    },
    orderBy: { date: "desc" }
  });
  return items.map((item) => mapTx(item, context.workspaceId));
}

function mapTx(
  item: {
    id: string;
    date: Date;
    descriptionRaw: string;
    descriptionClean: string;
    amount: Prisma.Decimal;
    direction: "income" | "expense" | "transfer";
    merchant: string | null;
    confidenceScore: number | null;
    isRecurring: boolean;
    isSubscription: boolean;
    isInternalTransfer: boolean;
    needsReview: boolean;
    categoryName: string | null;
    uploadedFileId: string | null;
  },
  workspaceId: string
) {
  return {
    id: item.id,
    date: item.date.toISOString(),
    descriptionRaw: item.descriptionRaw,
    descriptionClean: item.descriptionClean,
    amount: Number(item.amount),
    direction: item.direction,
    category: item.categoryName ?? "outros",
    merchant: item.merchant ?? undefined,
    confidenceScore: item.confidenceScore ?? 0.5,
    isRecurring: item.isRecurring,
    isSubscription: item.isSubscription,
    isInternalTransfer: item.isInternalTransfer,
    needsReview: item.needsReview,
    sourceFileId: item.uploadedFileId ?? "",
    workspace: workspaceId
  };
}

export async function updateTransaction(context: AuthContext, id: string, patch: { category?: string; needsReview?: boolean; isSubscription?: boolean }) {
  const updated = await prisma.transaction.updateMany({
    where: { id, workspaceId: context.workspaceId },
    data: {
      categoryName: patch.category,
      needsReview: patch.needsReview,
      isSubscription: patch.isSubscription
    }
  });
  return updated.count > 0;
}

export async function addAlert(context: AuthContext, payload: { type: "period_incomplete" | "subscription_detected" | "bill_due"; title: string; description: string }) {
  return prisma.alert.create({
    data: {
      workspaceId: context.workspaceId,
      type: payload.type,
      title: payload.title,
      description: payload.description
    }
  });
}

export async function listAlerts(context: AuthContext) {
  return prisma.alert.findMany({
    where: { workspaceId: context.workspaceId },
    orderBy: { createdAt: "desc" }
  });
}

export async function markAlertAsRead(context: AuthContext, id: string) {
  const updated = await prisma.alert.updateMany({
    where: { id, workspaceId: context.workspaceId },
    data: { isRead: true }
  });
  return updated.count > 0;
}

export async function listBills(context: AuthContext) {
  return prisma.bill.findMany({
    where: { workspaceId: context.workspaceId },
    orderBy: { dueDate: "asc" }
  });
}

export async function addBill(context: AuthContext, data: { beneficiary: string; amount: number; dueDate: string; barcode?: string }) {
  const due = new Date(data.dueDate);
  return prisma.bill.create({
    data: {
      workspaceId: context.workspaceId,
      beneficiary: data.beneficiary,
      amount: new Prisma.Decimal(data.amount),
      dueDate: due,
      status: due < new Date() ? "vencido" : "aberto",
      barcode: data.barcode
    }
  });
}

export async function markBillPaid(context: AuthContext, id: string) {
  const updated = await prisma.bill.updateMany({
    where: { id, workspaceId: context.workspaceId },
    data: { status: "pago" }
  });
  return updated.count > 0;
}

export async function refreshSubscriptions(context: AuthContext) {
  const txs = await listTransactions(context);
  const grouped = new Map<string, { amount: number; dates: string[] }>();
  for (const tx of txs) {
    if (tx.direction !== "expense") continue;
    const key = (tx.merchant || tx.descriptionClean).toLowerCase();
    if (!grouped.has(key)) grouped.set(key, { amount: 0, dates: [] });
    const item = grouped.get(key)!;
    item.amount += tx.amount;
    item.dates.push(tx.date);
  }

  const recurring = [...grouped.entries()].filter(([, item]) => item.dates.length >= 2).slice(0, 20);
  await prisma.subscription.deleteMany({ where: { workspaceId: context.workspaceId } });
  if (!recurring.length) return [];

  await prisma.subscription.createMany({
    data: recurring.map(([name, item]) => {
      const sorted = item.dates.sort();
      const last = new Date(sorted[sorted.length - 1]);
      const next = new Date(last);
      next.setMonth(next.getMonth() + 1);
      return {
        workspaceId: context.workspaceId,
        name,
        amount: new Prisma.Decimal(item.amount / item.dates.length),
        frequency: "mensal",
        lastChargeDate: last,
        nextChargeDate: next,
        isEssential: false
      };
    })
  });
  return prisma.subscription.findMany({ where: { workspaceId: context.workspaceId }, orderBy: { amount: "desc" } });
}

export async function listSubscriptions(context: AuthContext) {
  return prisma.subscription.findMany({
    where: { workspaceId: context.workspaceId },
    orderBy: { amount: "desc" }
  });
}

export async function addChatPair(context: AuthContext, userMessage: string, assistantMessage: string, chartSpecJson?: unknown) {
  let conversation = await prisma.aIConversation.findFirst({
    where: { userId: context.userId, workspaceId: context.workspaceId }
  });

  if (!conversation) {
    conversation = await prisma.aIConversation.create({
      data: { userId: context.userId, workspaceId: context.workspaceId }
    });
  }

  await prisma.aIMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: "user",
        content: userMessage
      },
      {
        conversationId: conversation.id,
        role: "assistant",
        content: assistantMessage,
        chartSpecJson: chartSpecJson as Prisma.InputJsonValue | undefined
      }
    ]
  });
}
