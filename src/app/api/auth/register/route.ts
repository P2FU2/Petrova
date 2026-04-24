import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  workspaceName: z.string().min(2).default("Meu Workspace")
});

export async function POST(req: Request) {
  const payload = schema.safeParse(await req.json());
  if (!payload.success) return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email: payload.data.email } });
  if (exists) return NextResponse.json({ error: "Email ja cadastrado." }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      email: payload.data.email,
      passwordHash: await hashPassword(payload.data.password),
      profile: { create: { onboardingDone: false } }
    }
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: payload.data.workspaceName,
      kind: "pf",
      members: {
        create: {
          userId: user.id,
          role: "owner"
        }
      }
    }
  });

  const token = signToken(user.id, workspace.id);
  return NextResponse.json({ token, workspaceId: workspace.id });
}
