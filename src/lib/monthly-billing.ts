import { prisma } from "@/lib/prisma";
import { platformStripe } from "@/lib/platform-stripe";

const FEE_RATE = 0.2;

/**
 * Runs on the 1st of each month (see /api/cron/monthly-billing). Bills
 * every creator 20% of what was recovered for them in the previous
 * calendar month, via our own platform Stripe account. Idempotent per
 * (customer, period) pair — safe to re-run if a run is interrupted.
 */
export async function runMonthlyBilling(now = new Date()) {
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const connections = await prisma.stripeConnection.findMany({
    include: { user: { include: { platformCustomer: true } } },
  });

  let billed = 0;
  let skipped = 0;
  let failed = 0;

  for (const connection of connections) {
    const platformCustomer = connection.user.platformCustomer;
    if (!platformCustomer?.defaultPaymentMethodId) {
      skipped++;
      continue;
    }

    const existing = await prisma.billingInvoice.findUnique({
      where: {
        platformCustomerId_periodStart: {
          platformCustomerId: platformCustomer.id,
          periodStart,
        },
      },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const recoveredResult = await prisma.failedPayment.aggregate({
      where: {
        connectionId: connection.id,
        status: "RECOVERED",
        recoveredAt: { gte: periodStart, lt: periodEnd },
      },
      _sum: { recoveredCents: true },
    });
    const recoveredCents = recoveredResult._sum.recoveredCents ?? 0;
    if (recoveredCents === 0) {
      skipped++;
      continue;
    }

    const feeCents = Math.round(recoveredCents * FEE_RATE);

    const invoice = await prisma.billingInvoice.create({
      data: {
        platformCustomerId: platformCustomer.id,
        periodStart,
        periodEnd,
        recoveredCents,
        feeCents,
        status: "PENDING",
      },
    });

    try {
      const paymentIntent = await platformStripe.paymentIntents.create({
        amount: feeCents,
        currency: "usd",
        customer: platformCustomer.stripeCustomerId,
        payment_method: platformCustomer.defaultPaymentMethodId,
        off_session: true,
        confirm: true,
      });
      await prisma.billingInvoice.update({
        where: { id: invoice.id },
        data: { status: "PAID", stripePaymentIntentId: paymentIntent.id },
      });
      billed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.billingInvoice.update({
        where: { id: invoice.id },
        data: { status: "FAILED", failureMessage: message },
      });
      failed++;
    }
  }

  return { billed, skipped, failed };
}
