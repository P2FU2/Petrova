import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { updateOnboarding } from "@/lib/repository";

const schema = z.object({
  preferredName: z.string().optional(),
  objective: z.string().optional(),
  useType: z.enum(["pf", "familia", "pj", "holding"]).optional(),
  startMode: z.enum(["upload", "integracao", "manual", "conversa"]).optional(),
  familiarity: z.enum(["basico", "intermediario", "avancado"]).optional()
});

export async function POST(req: NextRequest) {
  const context = await getAuthContext(req, true);
  if (!context) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados de onboarding invalidos." }, { status: 400 });
  }
  const onboarding = await updateOnboarding(context, parsed.data as Record<string, string>);
  return NextResponse.json(onboarding);
}
