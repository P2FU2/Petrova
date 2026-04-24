import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { getFile } from "@/lib/repository";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const context = await getAuthContext(req, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const { id } = await params;
  const file = await getFile(context, id);
  if (!file) {
    return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });
  }
  return NextResponse.json(file);
}
