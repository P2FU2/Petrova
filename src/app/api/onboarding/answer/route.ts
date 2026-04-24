import { NextResponse } from "next/server";
import { z } from "zod";
import { updateOnboarding } from "@/lib/store";

const schema = z.object({
  preferredName: z.string().optional(),
  objective: z.string().optional(),
  useType: z.enum(["pf", "familia", "pj", "holding"]).optional(),
  startMode: z.enum(["upload", "integracao", "manual", "conversa"]).optional(),
  familiarity: z.enum(["basico", "intermediario", "avancado"]).optional()
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados de onboarding invalidos." }, { status: 400 });
  }
  const onboarding = updateOnboarding(parsed.data);
  return NextResponse.json(onboarding);
}
