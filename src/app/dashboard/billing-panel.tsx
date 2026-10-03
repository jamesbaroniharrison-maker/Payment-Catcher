"use client";

import { useState } from "react";

type Invoice = {
  id: string;
  periodStart: string;
  feeCents: number;
  status: string;
};

export function BillingPanel({
  hasPaymentMethod,
  invoices,
}: {
  hasPaymentMethod: boolean;
  invoices: Invoice[];
}) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetup = async () => {
    setError(null);
    setIsRedirecting(true);
    try {
      const res = await fetch("/api/billing/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong");
        setIsRedirecting(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setIsRedirecting(false);
    }
  };

  return (
    <div className="w-full max-w-sm border rounded p-4 flex flex-col gap-3">
      <p className="text-sm font-medium">Billing</p>
      <p className="text-xs text-gray-500">
        We take 20% of what gets recovered each month, charged automatically on the 1st.
      </p>
      {hasPaymentMethod ? (
        <p className="text-sm text-green-700">Payment method on file</p>
      ) : (
        <>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleSetup}
            disabled={isRedirecting}
            className="border rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {isRedirecting ? "Redirecting..." : "Add payment method"}
          </button>
        </>
      )}
      {invoices.length > 0 && (
        <div className="flex flex-col gap-1 mt-2">
          <p className="text-xs font-medium text-gray-500">Invoice history</p>
          <ul className="flex flex-col gap-1">
            {invoices.map((inv) => (
              <li key={inv.id} className="text-xs flex justify-between">
                <span>{new Date(inv.periodStart).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                <span>
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(inv.feeCents / 100)}
                  {" · "}
                  {inv.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
