import { FileStatus } from "@prisma/client";
import type { AuthContext } from "@/lib/auth";
import { addAlert, getFile, setFileStatus, storeParsedTransactions } from "@/lib/repository";
import { loadFileBuffer } from "@/lib/file-storage";
import { parseBufferToTransactions } from "@/lib/parser";

export async function processUploadedFile(context: AuthContext, fileId: string) {
  const file = await getFile(context, fileId);
  if (!file) throw new Error("Arquivo nao encontrado");
  if (!file.blobBase64) throw new Error("Arquivo sem conteudo para processamento");

  await setFileStatus(context, fileId, FileStatus.processing);
  const buffer = await loadFileBuffer(file.blobBase64);
  const parsed = await parseBufferToTransactions(buffer, file.filename, file.mimeType, fileId);

  const dates = parsed.map((tx) => new Date(tx.date).getTime()).filter((v) => Number.isFinite(v));
  const minDate = dates.length ? new Date(Math.min(...dates)).toISOString() : undefined;
  const maxDate = dates.length ? new Date(Math.max(...dates)).toISOString() : undefined;
  const subscriptions = parsed.filter((tx) => tx.isSubscription);

  await storeParsedTransactions(context, fileId, parsed);
  await setFileStatus(context, fileId, parsed.some((tx) => tx.needsReview) ? FileStatus.needs_review : FileStatus.parsed, minDate, maxDate);

  if (minDate && maxDate && minDate.slice(0, 7) === maxDate.slice(0, 7)) {
    await addAlert(context, {
      type: "period_incomplete",
      title: "Periodo potencialmente incompleto",
      description: `Dados enviados cobrem somente ${minDate.slice(0, 7)}.`
    });
  }

  if (subscriptions.length > 0) {
    await addAlert(context, {
      type: "subscription_detected",
      title: "Assinaturas detectadas",
      description: `Detectamos ${subscriptions.length} lancamentos com padrao recorrente.`
    });
  }

  return {
    transactionsFound: parsed.length,
    needsReview: parsed.some((tx) => tx.needsReview)
  };
}
