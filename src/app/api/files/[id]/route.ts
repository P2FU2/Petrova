import { NextResponse } from "next/server";
import { getFile } from "@/lib/store";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const file = getFile(id);
  if (!file) {
    return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });
  }
  return NextResponse.json(file);
}
