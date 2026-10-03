import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { platformStripe } from "@/lib/platform-stripe";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headerList = request.headers;
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${headerList.get("x-forwarded-proto") ?? "http"}://${headerList.get("host")}`;

  let platformCustomer = await prisma.platformCustomer.findUnique({
    where: { userId: session.user.id },
  });

  if (!platformCustomer) {
    const customer = await platformStripe.customers.create({
      email: session.user.email ?? undefined,
      metadata: { userId: session.user.id },
    });
    platformCustomer = await prisma.platformCustomer.create({
      data: { userId: session.user.id, stripeCustomerId: customer.id },
    });
  }

  const checkoutSession = await platformStripe.checkout.sessions.create({
    mode: "setup",
    customer: platformCustomer.stripeCustomerId,
    payment_method_types: ["card"],
    success_url: `${origin}/api/billing/callback?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
