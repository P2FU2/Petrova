import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { completeOnboarding } from "@/lib/repository";

export async function POST(req: NextRequest) {
  const context = await getAuthContext(req, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const onboarding = await completeOnboarding(context);
  return NextResponse.json(onboarding);
}
