import { NextResponse } from "next/server";
import { addAlert, addStagedTransactions, getFile, updateFile } from "@/lib/store";
import { parseFileToTransactions } from "@/lib/parser";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const fileRecord = getFile(id);

  if (!fileRecord) {
    return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });
  }

  const data = await req.formData();
  const file = data.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatorio para processamento." }, { status: 400 });
  }

  updateFile(id, { status: "processing" });
  const parsed = await parseFileToTransactions(file, id);

  const dates = parsed.map((tx) => new Date(tx.date).getTime()).filter((v) => Number.isFinite(v));
  const minDate = dates.length ? new Date(Math.min(...dates)).toISOString() : undefined;
  const maxDate = dates.length ? new Date(Math.max(...dates)).toISOString() : undefined;
  const needsReview = parsed.some((tx) => tx.needsReview);
  const subscriptions = parsed.filter((tx) => tx.isSubscription);

  addStagedTransactions(parsed);
  updateFile(id, {
    status: needsReview ? "needs_review" : "parsed",
    parsedTransactions: parsed,
    periodStart: minDate,
    periodEnd: maxDate
  });

  if (minDate && maxDate && minDate.slice(0, 7) === maxDate.slice(0, 7)) {
    addAlert({
      type: "period_incomplete",
      title: "Periodo potencialmente incompleto",
      description: `Dados enviados cobrem somente ${minDate.slice(0, 7)}.`
    });
  }

  if (subscriptions.length > 0) {
    addAlert({
      type: "subscription_detected",
      title: "Assinaturas detectadas",
      description: `Detectamos ${subscriptions.length} lancamentos com padrao recorrente.`
    });
  }

  return NextResponse.json({
    fileId: id,
    transactionsFound: parsed.length,
    needsReview
  });
}
