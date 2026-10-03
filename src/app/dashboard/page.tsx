import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "./sign-out-button";
import { StripeConnectionPanel } from "./stripe-connection-panel";
import { FailedPaymentsList } from "./failed-payments-list";
import { getMonthlyRecoveredCents } from "@/lib/billing";
import { BillingPanel } from "./billing-panel";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const connection = await prisma.stripeConnection.findUnique({
    where: { userId: session.user.id },
    select: { id: true, stripeAccountId: true, accountName: true, encryptedWebhookSecret: true },
  });

  const headerList = await headers();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${headerList.get("x-forwarded-proto") ?? "http"}://${headerList.get("host")}`;
  const webhookUrl = connection ? `${origin}/api/webhooks/stripe/${connection.id}` : null;

  const failedPayments = connection
    ? await prisma.failedPayment.findMany({
        where: { connectionId: connection.id, status: { in: ["OPEN", "RECOVERING"] } },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  const monthlyRecoveredCents = connection ? await getMonthlyRecoveredCents(connection.id) : 0;

  const platformCustomer = await prisma.platformCustomer.findUnique({
    where: { userId: session.user.id },
    include: { invoices: { orderBy: { periodStart: "desc" }, take: 12 } },
  });

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-gray-600">Logged in as {session.user.email}</p>
      {connection && (
        <p className="text-sm text-gray-600">
          Recovered this month:{" "}
          <span className="font-medium text-black">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
              monthlyRecoveredCents / 100,
            )}
          </span>
        </p>
      )}
      <StripeConnectionPanel
        connection={
          connection
            ? {
                stripeAccountId: connection.stripeAccountId,
                accountName: connection.accountName,
                hasWebhookSecret: Boolean(connection.encryptedWebhookSecret),
              }
            : null
        }
        webhookUrl={webhookUrl}
      />
      {connection && <FailedPaymentsList payments={failedPayments} />}
      <BillingPanel
        hasPaymentMethod={Boolean(platformCustomer?.defaultPaymentMethodId)}
        invoices={
          platformCustomer?.invoices.map((inv) => ({
            id: inv.id,
            periodStart: inv.periodStart.toISOString(),
            feeCents: inv.feeCents,
            status: inv.status,
          })) ?? []
        }
      />
      <SignOutButton />
    </main>
  );
}
