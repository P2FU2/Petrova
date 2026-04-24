import { NextResponse } from "next/server";
import { addUploadedFile } from "@/lib/store";
import { detectDocumentType } from "@/lib/parser";

export async function POST(req: Request) {
  const data = await req.formData();
  const file = data.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo nao enviado." }, { status: 400 });
  }

  const record = addUploadedFile({
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    status: "uploaded",
    documentType: detectDocumentType(file.name),
    parsedTransactions: []
  });

  return NextResponse.json(record, { status: 201 });
}
