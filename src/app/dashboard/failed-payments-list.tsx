type FailedPayment = {
  id: string;
  stripeObjectId: string;
  customerEmail: string | null;
  amountCents: number;
  currency: string;
  declineCode: string | null;
  retryStrategy: string;
  status: string;
  createdAt: Date;
};

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}

export function FailedPaymentsList({ payments }: { payments: FailedPayment[] }) {
  if (payments.length === 0) {
    return (
      <div className="w-full max-w-sm border rounded p-4">
        <p className="text-sm text-gray-500">No failed payments yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm border rounded p-4 flex flex-col gap-3">
      <p className="text-sm font-medium">Failed payments</p>
      <ul className="flex flex-col gap-2">
        {payments.map((p) => (
          <li key={p.id} className="text-sm border-b last:border-0 pb-2 last:pb-0">
            <div className="flex justify-between">
              <span>{p.customerEmail ?? p.stripeObjectId}</span>
              <span className="font-medium">{formatAmount(p.amountCents, p.currency)}</span>
            </div>
            <div className="text-xs text-gray-500">
              {p.declineCode ?? "unknown reason"} · {p.retryStrategy} · {p.status}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
