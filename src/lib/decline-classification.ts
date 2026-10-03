export type RetryStrategy = "IMMEDIATE_RETRY" | "WAIT_AND_EMAIL";

const IMMEDIATE_RETRY_CODES = new Set([
  "insufficient_funds",
  "withdrawal_count_limit_exceeded",
  "try_again_later",
  "processing_error",
  "issuer_not_available",
  "reenter_transaction",
]);

const WAIT_AND_EMAIL_CODES = new Set([
  "expired_card",
  "incorrect_cvc",
  "invalid_cvc",
  "incorrect_number",
  "invalid_number",
  "invalid_expiry_month",
  "invalid_expiry_year",
  "card_declined",
  "do_not_honor",
  "generic_decline",
  "lost_card",
  "stolen_card",
  "pickup_card",
  "restricted_card",
  "revocation_of_authorization",
  "fraudulent",
]);

/**
 * Soft declines (temporary, likely to succeed on their own soon) get an
 * instant retry. Hard declines (something about the card itself is wrong)
 * need the customer to act, so we go straight to the email sequence.
 * Unrecognized codes default to WAIT_AND_EMAIL — safer than repeatedly
 * hammering a card that's never going to work.
 */
export function classifyDeclineReason(declineCode: string | null | undefined): RetryStrategy {
  if (declineCode && IMMEDIATE_RETRY_CODES.has(declineCode)) {
    return "IMMEDIATE_RETRY";
  }
  if (declineCode && WAIT_AND_EMAIL_CODES.has(declineCode)) {
    return "WAIT_AND_EMAIL";
  }
  return "WAIT_AND_EMAIL";
}
