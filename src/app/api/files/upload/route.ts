import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { detectDocumentType } from "@/lib/parser";
import { createUploadedFile } from "@/lib/repository";
import { enqueueFileProcessing } from "@/lib/queue";
import { saveFileContent } from "@/lib/file-storage";

export async function POST(req: NextRequest) {
  const context = await getAuthContext(req, false);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const data = await req.formData();
  const file = data.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo nao enviado." }, { status: 400 });
  }

  const record = await createUploadedFile(context, {
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    documentType: detectDocumentType(file.name),
    blobBase64: await saveFileContent(file)
  });

  await enqueueFileProcessing({ fileId: record.id, context });

  return NextResponse.json(record, { status: 201 });
}
