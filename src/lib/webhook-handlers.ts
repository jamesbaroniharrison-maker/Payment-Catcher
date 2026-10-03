import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { classifyDeclineReason } from "@/lib/decline-classification";

type FailureDetails = {
  stripeObjectId: string;
  stripeCustomerId: string | null;
  customerEmail: string | null;
  amountCents: number;
  currency: string;
  declineCode: string | null;
  failureMessage: string | null;
};

function customerIdFrom(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

async function extractFailureDetails(
  stripe: Stripe,
  event: Stripe.Event,
): Promise<FailureDetails | null> {
  if (event.type === "charge.failed") {
    const charge = event.data.object as Stripe.Charge;
    return {
      stripeObjectId: charge.id,
      stripeCustomerId: customerIdFrom(charge.customer),
      customerEmail: charge.billing_details?.email ?? null,
      amountCents: charge.amount,
      currency: charge.currency,
      declineCode: charge.failure_code ?? null,
      failureMessage: charge.failure_message ?? null,
    };
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    let declineCode: string | null = null;
    let failureMessage: string | null = null;

    try {
      const invoicePayments = await stripe.invoicePayments.list({ invoice: invoice.id, limit: 1 });
      const paymentIntentRef = invoicePayments.data[0]?.payment?.payment_intent;
      const paymentIntentId = typeof paymentIntentRef === "string" ? paymentIntentRef : paymentIntentRef?.id;

      if (paymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        declineCode = paymentIntent.last_payment_error?.decline_code ?? paymentIntent.last_payment_error?.code ?? null;
        failureMessage = paymentIntent.last_payment_error?.message ?? null;
      }
    } catch {
      // Fall back to no decline detail rather than fail the whole webhook.
    }

    return {
      stripeObjectId: invoice.id ?? `invoice_${event.id}`,
      stripeCustomerId: customerIdFrom(invoice.customer),
      customerEmail: invoice.customer_email ?? null,
      amountCents: invoice.amount_due,
      currency: invoice.currency,
      declineCode,
      failureMessage,
    };
  }

  return null;
}

/**
 * Invoices can be retried through the API (`invoices.pay`); one-off charges
 * can't be re-run directly (a Charge is an immutable record of one attempt).
 * Skool subscription billing is invoice-based, so this covers the real case
 * — a bare charge.failed with no invoice just gets logged and left for the
 * email sequence (Piece 5's cron) to handle instead.
 */
async function attemptImmediateRetry(stripe: Stripe, failedPaymentId: string, stripeObjectId: string) {
  if (!stripeObjectId.startsWith("in_")) {
    console.log(`[recovery] no invoice to retry for ${stripeObjectId}, leaving for the email sequence`);
    return;
  }

  try {
    await stripe.invoices.pay(stripeObjectId);
    console.log(`[recovery] instant retry succeeded for invoice ${stripeObjectId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[recovery] instant retry failed for invoice ${stripeObjectId}: ${message}`);
  }

  await prisma.failedPayment.update({
    where: { id: failedPaymentId },
    data: { lastRetryAt: new Date() },
  });
}

export async function handlePaymentFailed(stripe: Stripe, connectionId: string, event: Stripe.Event) {
  const details = await extractFailureDetails(stripe, event);
  if (!details) return;

  const retryStrategy = classifyDeclineReason(details.declineCode);

  const failedPayment = await prisma.failedPayment.upsert({
    where: {
      connectionId_stripeObjectId: {
        connectionId,
        stripeObjectId: details.stripeObjectId,
      },
    },
    create: {
      connectionId,
      stripeObjectId: details.stripeObjectId,
      stripeCustomerId: details.stripeCustomerId,
      customerEmail: details.customerEmail,
      amountCents: details.amountCents,
      currency: details.currency,
      declineCode: details.declineCode,
      failureMessage: details.failureMessage,
      retryStrategy,
      status: "OPEN",
    },
    update: {
      declineCode: details.declineCode,
      failureMessage: details.failureMessage,
      retryStrategy,
      status: "OPEN",
    },
  });

  if (retryStrategy === "IMMEDIATE_RETRY") {
    await attemptImmediateRetry(stripe, failedPayment.id, failedPayment.stripeObjectId);
  }
}

/**
 * Fired on payment_method.attached / customer.updated — the customer may
 * have just fixed the card that caused a failure. Rather than wait for the
 * next day's email, retry any of their still-open invoices right away.
 */
export async function handleCardUpdated(stripe: Stripe, connectionId: string) {
  const openInvoicePayments = await prisma.failedPayment.findMany({
    where: {
      connectionId,
      status: { in: ["OPEN", "RECOVERING"] },
      stripeObjectId: { startsWith: "in_" },
    },
  });

  for (const payment of openInvoicePayments) {
    await attemptImmediateRetry(stripe, payment.id, payment.stripeObjectId);
  }
}

type SuccessDetails = { stripeObjectId: string; amountCents: number };

function extractSuccessDetails(event: Stripe.Event): SuccessDetails | null {
  if (event.type === "charge.succeeded") {
    const charge = event.data.object as Stripe.Charge;
    return { stripeObjectId: charge.id, amountCents: charge.amount };
  }
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    return { stripeObjectId: invoice.id, amountCents: invoice.amount_paid };
  }
  return null;
}

/**
 * A successful charge/invoice only matters to us if it closes out a
 * FailedPayment we're already tracking for this same Stripe object — a
 * plain successful payment with no prior failure is not our concern.
 */
export async function handlePaymentSucceeded(connectionId: string, event: Stripe.Event) {
  const details = extractSuccessDetails(event);
  if (!details) return;

  const existing = await prisma.failedPayment.findUnique({
    where: {
      connectionId_stripeObjectId: {
        connectionId,
        stripeObjectId: details.stripeObjectId,
      },
    },
  });

  if (!existing || existing.status === "RECOVERED") return;

  await prisma.failedPayment.update({
    where: { id: existing.id },
    data: {
      status: "RECOVERED",
      recoveredAt: new Date(),
      recoveredCents: details.amountCents,
    },
  });

  console.log(`[recovery] payment recovered for connection ${connectionId}: ${details.stripeObjectId}`);
}
