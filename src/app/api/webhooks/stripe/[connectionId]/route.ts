import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { handlePaymentFailed, handleCardUpdated, handlePaymentSucceeded } from "@/lib/webhook-handlers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ connectionId: string }> },
) {
  const { connectionId } = await params;

  const connection = await prisma.stripeConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) {
    return NextResponse.json({ error: "Unknown connection" }, { status: 404 });
  }
  if (!connection.encryptedWebhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();
  const apiKey = decrypt(connection.encryptedApiKey);
  const webhookSecret = decrypt(connection.encryptedWebhookSecret);
  const stripe = new Stripe(apiKey);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await prisma.stripeWebhookEvent.create({
      data: { id: event.id, connectionId, type: event.type },
    });
  } catch {
    // Unique constraint violation: we've already processed this event (Stripe retry).
    return NextResponse.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case "invoice.payment_failed":
    case "charge.failed":
      await handlePaymentFailed(stripe, connectionId, event);
      break;
    case "invoice.payment_succeeded":
    case "charge.succeeded":
      await handlePaymentSucceeded(connectionId, event);
      break;
    case "payment_method.attached":
    case "customer.updated":
      await handleCardUpdated(stripe, connectionId);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
