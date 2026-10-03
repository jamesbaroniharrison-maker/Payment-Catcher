import { prisma } from "@/lib/prisma";
import { sendRecoveryEmail } from "@/lib/email";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Runs once a day (see /api/cron/recovery-sequence). For every failed
 * payment still open, checks whether it has crossed the next threshold in
 * the 1/3/5-7 day schedule and, if so, sends that stage's email exactly
 * once. One stage per record per run — if a run gets skipped, the next
 * run picks up wherever the record actually is, it doesn't try to send
 * every missed stage at once.
 */
export async function runRecoverySequence(now = new Date()) {
  const openPayments = await prisma.failedPayment.findMany({
    where: { status: { in: ["OPEN", "RECOVERING"] } },
  });

  let day1Sent = 0;
  let day3Sent = 0;
  let finalSent = 0;

  for (const payment of openPayments) {
    if (!payment.customerEmail) {
      continue;
    }

    const ageDays = (now.getTime() - payment.createdAt.getTime()) / DAY_MS;

    if (ageDays >= 5 && payment.day3EmailSentAt && !payment.finalEmailSentAt) {
      await sendRecoveryEmail({
        stage: "final",
        to: payment.customerEmail,
        amountCents: payment.amountCents,
        currency: payment.currency,
      });
      await prisma.failedPayment.update({
        where: { id: payment.id },
        data: { finalEmailSentAt: now, status: "ABANDONED" },
      });
      finalSent++;
      continue;
    }

    if (ageDays >= 3 && payment.day1EmailSentAt && !payment.day3EmailSentAt) {
      await sendRecoveryEmail({
        stage: "day3",
        to: payment.customerEmail,
        amountCents: payment.amountCents,
        currency: payment.currency,
      });
      await prisma.failedPayment.update({
        where: { id: payment.id },
        data: { day3EmailSentAt: now },
      });
      day3Sent++;
      continue;
    }

    if (ageDays >= 1 && !payment.day1EmailSentAt) {
      await sendRecoveryEmail({
        stage: "day1",
        to: payment.customerEmail,
        amountCents: payment.amountCents,
        currency: payment.currency,
      });
      await prisma.failedPayment.update({
        where: { id: payment.id },
        data: { day1EmailSentAt: now, status: "RECOVERING" },
      });
      day1Sent++;
    }
  }

  return { scanned: openPayments.length, day1Sent, day3Sent, finalSent };
}
