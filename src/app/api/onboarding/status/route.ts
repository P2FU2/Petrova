import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { getOnboarding } from "@/lib/repository";

export async function GET(req: NextRequest) {
  const context = await getAuthContext(req, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  return NextResponse.json(await getOnboarding(context));
}
