import { Resend } from "resend";

export type RecoveryEmailStage = "day1" | "day3" | "final";

type SendRecoveryEmailArgs = {
  stage: RecoveryEmailStage;
  to: string;
  amountCents: number;
  currency: string;
};

const SUBJECTS: Record<RecoveryEmailStage, string> = {
  day1: "Your payment didn't go through",
  day3: "Reminder: your payment is still failing",
  final: "Final notice: update your payment method",
};

const BODIES: Record<RecoveryEmailStage, (amount: string) => string> = {
  day1: (amount) =>
    `We tried to charge your card for ${amount} and it didn't go through. This happens sometimes — could you check that your card is up to date and try again?`,
  day3: (amount) =>
    `Just a reminder: your payment of ${amount} is still failing. Please update your payment method to avoid losing access.`,
  final: (amount) =>
    `This is a final notice — your payment of ${amount} is still failing and your access may be affected soon. Please update your payment method as soon as possible.`,
};

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_ADDRESS = process.env.RECOVERY_EMAIL_FROM ?? "onboarding@resend.dev";

/**
 * Falls back to logging when RESEND_API_KEY isn't set, so the recovery
 * sequence still runs end to end in dev without needing a real provider
 * configured. Set RESEND_API_KEY (and ideally RECOVERY_EMAIL_FROM on a
 * verified domain) to start actually sending.
 */
export async function sendRecoveryEmail({ stage, to, amountCents, currency }: SendRecoveryEmailArgs) {
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
    amountCents / 100,
  );
  const subject = SUBJECTS[stage];
  const text = BODIES[stage](amount);

  if (!resend) {
    console.log(`[email:stub] would send "${subject}" to ${to} for ${amount}`);
    return;
  }

  try {
    await resend.emails.send({ from: FROM_ADDRESS, to, subject, text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[email] failed to send "${subject}" to ${to}: ${message}`);
  }
}
