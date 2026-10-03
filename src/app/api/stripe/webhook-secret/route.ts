import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

const webhookSecretSchema = z.object({
  webhookSecret: z.string().regex(/^whsec_/, "Must be a webhook signing secret (starts with whsec_)"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = webhookSecretSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const connection = await prisma.stripeConnection.findUnique({
    where: { userId: session.user.id },
  });
  if (!connection) {
    return NextResponse.json({ error: "Connect Stripe first" }, { status: 400 });
  }

  await prisma.stripeConnection.update({
    where: { userId: session.user.id },
    data: { encryptedWebhookSecret: encrypt(parsed.data.webhookSecret) },
  });

  return NextResponse.json({ ok: true });
}
