import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { processUploadedFile } from "@/lib/file-processing";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const context = await getAuthContext(request, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const { id } = await params;
  try {
    const result = await processUploadedFile(context, id);
    return NextResponse.json({
      fileId: id,
      transactionsFound: result.transactionsFound,
      needsReview: result.needsReview
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha no processamento." }, { status: 400 });
  }
}
