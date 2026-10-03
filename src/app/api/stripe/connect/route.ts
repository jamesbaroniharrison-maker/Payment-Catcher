import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

const connectSchema = z.object({
  apiKey: z.string().regex(/^rk_(test|live)_/, "Must be a restricted API key (starts with rk_test_ or rk_live_)"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = connectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const apiKey = parsed.data.apiKey;
  const stripe = new Stripe(apiKey);

  let account: Stripe.Account;
  try {
    account = await stripe.accounts.retrieve(null);
  } catch (err) {
    const message =
      err instanceof Stripe.errors.StripeError
        ? err.message
        : "Could not verify this key with Stripe";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const encryptedApiKey = encrypt(apiKey);
  const accountName = account.business_profile?.name ?? account.settings?.dashboard?.display_name ?? null;

  await prisma.stripeConnection.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      stripeAccountId: account.id,
      accountName,
      encryptedApiKey,
    },
    update: {
      stripeAccountId: account.id,
      accountName,
      encryptedApiKey,
    },
  });

  return NextResponse.json({ stripeAccountId: account.id, accountName });
}
