import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { platformStripe } from "@/lib/platform-stripe";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const platformCustomer = await prisma.platformCustomer.findUnique({
    where: { userId: session.user.id },
  });
  if (!platformCustomer) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const checkoutSession = await platformStripe.checkout.sessions.retrieve(sessionId, {
    expand: ["setup_intent"],
  });

  // Only accept this checkout session if it belongs to the logged-in
  // user's own platform customer — otherwise someone could try to attach
  // a stranger's session_id to their own account.
  if (checkoutSession.customer !== platformCustomer.stripeCustomerId) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const setupIntent = checkoutSession.setup_intent;
  const paymentMethodId =
    typeof setupIntent === "object" && setupIntent
      ? typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id
      : null;

  if (paymentMethodId) {
    await prisma.platformCustomer.update({
      where: { userId: session.user.id },
      data: { defaultPaymentMethodId: paymentMethodId },
    });
    await platformStripe.customers.update(platformCustomer.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
