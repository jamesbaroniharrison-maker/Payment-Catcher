import Stripe from "stripe";

/**
 * Our own platform Stripe account — used only to bill creators their 20%
 * fee. Do not confuse with the per-creator restricted keys in
 * StripeConnection, which read/act on each creator's own Stripe account.
 */
export const platformStripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
