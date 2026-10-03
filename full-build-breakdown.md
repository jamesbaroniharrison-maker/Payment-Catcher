# Full Build Breakdown — Plain Language Version

Two stages. Stage 1 is the smallest version that can actually work and make money. Stage 2 is everything we add later, only after Stage 1 is working and people are using it. We do not touch Stage 2 until Stage 1 is proven.

---

# STAGE 1: THE CORE BUILD (what we build first)

This is broken into 9 pieces. Each piece is a separate chunk of work. We build them roughly in this order, because each one depends on the one before it.

## Piece 1: A place for creators to sign up and log in

**What it is:** A simple webpage where a Skool community owner can create an account with their email and a password (or "log in with Google" to keep it simple).

**What the program needs to do (in plain terms):**
- When someone types an email and password and clicks "Sign Up," the program checks: is this email already used? If yes, show an error. If no, save their email and a scrambled/encrypted version of their password (never save the real password as plain text — this is a security basic).
- When someone comes back and clicks "Log In," the program checks: does this email exist, and does the password match? If yes, let them in. If no, show an error.
- The program needs to remember "this person is logged in" as they click around the site (this is called a session — think of it like a wristband at an event that proves you already checked in).

**Why this comes first:** Nothing else works without knowing who the user is.

---

## Piece 2: Connecting the creator's Stripe account

**What it is:** A button that says "Connect Stripe." When clicked, it sends the creator to Stripe's own website to approve the connection, then brings them back to our site.

**What the program needs to do:**
- When the "Connect Stripe" button is clicked, send the creator to a special Stripe link (Stripe provides this — it's called Stripe Connect).
- Stripe asks the creator to approve access, then sends them back to our site with a special code.
- The program takes that code, sends it back to Stripe, and Stripe replies with a permanent ID that represents "this creator's Stripe account is now linked to us."
- Save that ID next to the creator's account in our database, so we always know which Stripe account belongs to which creator.

**Why this matters:** This is the single most important connection in the whole product. Without it, we can't see anything about their payments.

---

## Piece 3: The listener that catches failed payments the moment they happen

**What it is:** This is called a "webhook." Think of it like a doorbell. Every time something happens in the creator's Stripe account (a payment fails, a payment succeeds, a card is updated), Stripe rings our doorbell instantly by sending us a message.

**What the program needs to do:**
- Set up one web address (like a mailbox) that Stripe is allowed to send messages to.
- Every time a message arrives, the program checks: what kind of event is this?
  - If it's "a payment failed" → go do the steps in Piece 4.
  - If it's "a payment succeeded" → check if this was a recovery (a payment that had previously failed) and if so, go do the steps in Piece 6.
  - If it's "a card was updated" → optionally, immediately try charging them again instead of waiting.
- Ignore any message type we don't care about.

**Why this matters:** This is the engine of the whole product. Everything else reacts to what this piece detects.

---

## Piece 4: What happens the moment a payment fails (the decision-making step)

**What it is:** A checklist the program runs through every single time it hears "a payment failed."

**What the program needs to do, step by step:**
1. Save a new record: who failed to pay, how much, when, and why (Stripe tells us the reason — like "insufficient funds" or "expired card").
2. Look at the reason it failed. Some reasons mean "try again soon, it'll probably work" (like insufficient funds — maybe they get paid Friday). Other reasons mean "don't retry yet, they need to fix something" (like an expired card).
3. Based on that reason, decide: do we retry the charge automatically right now, or do we wait and send an email first?
4. Start the "recovery sequence" — this is just a fancy way of saying "the schedule of emails and retries we're about to run" (covered in Piece 5).

**Why this matters:** Not every failed payment should be treated the same way. This is the "smart" part of "smart retry."

---

## Piece 5: The recovery sequence (the emails and retry schedule)

**What it is:** A simple, timed checklist of actions that runs over about 5-7 days for each failed payment.

**What the program needs to do:**
- Day 0: If the failure reason suggests it's worth an instant retry, try the charge again right away.
- Day 1: If it's still failed, send email #1 — a friendly note that says "your payment didn't go through, here's a link to fix your card."
- Day 3: If it's STILL failed, send email #2 — a slightly more urgent reminder.
- Day 5-7: Send a final email before the creator's own Skool community removes their access.
- At any point, if we hear "a card was updated" (from Piece 3) or "payment succeeded," stop the sequence immediately and mark it recovered (Piece 6).

**What "the program needs to loop through" means here in plain terms:** the program needs a repeating check (running once a day, automatically, with no person clicking anything) that asks: "are there any failed payments sitting at exactly 1 day old that haven't gotten their Day 1 email yet? If yes, send it. Are there any sitting at exactly 3 days old without their Day 2 email? Send it." This repeating daily check is the "loop" — it just means the program checks itself on a timer, over and over, without a person doing it manually.

**Why this matters:** This sequence IS the product. Everything else supports this.

---

## Piece 6: Marking a payment as "recovered" and counting the money

**What it is:** The moment a previously-failed payment succeeds, we need to record it properly so we know how much money we recovered and can bill correctly later.

**What the program needs to do:**
1. When a "payment succeeded" message comes in (from Piece 3), check: does this match a payment we previously marked as failed?
2. If yes: mark that failed payment record as "recovered," save the amount, and stop any further emails from going out for it.
3. Add that amount to a running monthly total for that creator (this total is what we use in Piece 7 to bill them).

**Why this matters:** This is how the whole "we only get paid if it works" promise actually gets tracked and proven.

---

## Piece 7: Billing the creator their share (this is how we get paid)

**What it is:** Once a month, the program automatically calculates 20% of everything recovered that month for each creator, and charges them.

**What the program needs to do:**
1. On the 1st of each month, run through every creator account.
2. For each one, add up everything marked "recovered" in the previous month (from Piece 6).
3. Multiply that total by 20% — that's our fee.
4. Use Stripe to automatically charge the creator's card on file for that amount (Stripe has a built-in tool for this — we don't have to build our own credit card charging system from scratch).
5. Save a record of that invoice, so both we and the creator can see a clear history.

**Why this matters:** This is the actual revenue engine — the reason the business makes money.

---

## Piece 8: A simple dashboard the creator can log into and see

**What it is:** One page, kept very simple, showing:
- How much has been recovered this month
- A list of failed payments currently being worked on
- A button to disconnect Stripe if they ever want to stop

**What the program needs to do:**
- Pull the numbers calculated in Pieces 4-7 and display them on the page.
- Nothing fancy — no graphs or charts needed yet. Just numbers and a list.

**Why this matters:** Creators need to trust the system is working. Seeing real numbers builds that trust fast.

---

## Piece 9: The public landing page and sign-up flow

**What it is:** The actual marketing page a Skool creator lands on before they even have an account — the page we already drafted the copy for.

**What the program needs to do:**
- Show the headline, explanation, and pricing (already written).
- Have one clear button: "Connect your Stripe account" — which takes them straight into Piece 1 (sign up) and then Piece 2 (connect Stripe) back to back, with as few steps as possible.

**Why this matters:** This is the very first thing a stranger sees. It needs to be dead simple, because we have no salesperson walking them through it.

---

## About "discussion pages" while we build

While we're building this together, here's where different kinds of problems get solved:
- **If the program breaks or gives an error:** we troubleshoot it right here in our conversation — you paste the error, I explain what it means and fix it.
- **If it's a Stripe-specific question** (like "why isn't my webhook receiving anything"): Stripe has its own documentation and a developer discussion forum, but I can look that up for you directly instead of sending you there — just tell me what's happening.
- **If it's a "how do Skool creators think about this" question** (like pricing feedback or feature requests): that's where posting in Skool creator communities or relevant subreddits comes in, and I can help you write those posts.

You won't need to manage multiple separate discussion boards yourself — bring questions here first, and I'll tell you if it's something we solve together or something that needs an outside resource.

---

# STAGE 2: THE EXTRAS (only after Stage 1 is working and has real paying creators)

We do not start any of these until Stage 1 has active, paying accounts. Building these too early is the #1 way solo builders waste months on features nobody asked for yet.

## Extra 1: Text message (SMS) recovery, not just email
Add a step in the recovery sequence (Piece 5) that also sends a text message, since texts get opened far more often than email. Requires connecting a texting service (Twilio is the standard one) and a small amount of extra logic to decide when to text vs. email.

## Extra 2: Smarter retry timing
Instead of a flat "day 1, day 3, day 5" schedule, adjust timing based on the specific decline reason — for example, retrying "insufficient funds" failures on a payday-adjacent schedule instead of a fixed day count.

## Extra 3: Expiring card warnings (before the payment even fails)
Instead of only reacting after a payment fails, proactively check for cards expiring soon and email the member a few days ahead of time, preventing the failure from happening at all.

## Extra 4: Supporting creators with more than one Skool community
Let a single account manage multiple communities/Stripe connections instead of just one, for creators who run more than one paid Skool group.

## Extra 5: Referral system
A simple way for existing happy creators to refer other creators, since word-of-mouth is your main growth channel and this makes it easy and trackable.

## Extra 6: Basic analytics/reporting
Simple charts showing recovery rate over time, instead of just the current-month number — useful once you have a few months of real data to show.

## Extra 7: Team/staff logins
If a creator has a team member who manages their community, let them add a second login instead of sharing one password — only needed once you have creators asking for it.

## Extra 8: Win-back campaigns for canceled members
Beyond just recovering failed payments, reach out to members who fully canceled to see if a discount or pause option would bring them back — this is what Churnkey charges a premium for, and could be a natural upsell later.

---

# The rule for moving from Stage 1 to Stage 2

Don't start Stage 2 items just because they seem useful. Start them only when either: (a) a real paying creator specifically asks for it, or (b) you have clear evidence a Stage 1 piece is losing you money or customers without it. Everything else waits.
