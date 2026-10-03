"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Connection = {
  stripeAccountId: string;
  accountName: string | null;
  hasWebhookSecret: boolean;
} | null;

export function StripeConnectionPanel({
  connection,
  webhookUrl,
}: {
  connection: Connection;
  webhookUrl: string | null;
}) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      setApiKey("");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsSubmitting(true);
    try {
      await fetch("/api/stripe/disconnect", { method: "POST" });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveWebhookSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookError(null);
    setIsSavingWebhook(true);

    try {
      const res = await fetch("/api/stripe/webhook-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookSecret }),
      });
      const data = await res.json();

      if (!res.ok) {
        setWebhookError(data.error ?? "Something went wrong");
        return;
      }

      setWebhookSecret("");
      router.refresh();
    } catch {
      setWebhookError("Something went wrong. Please try again.");
    } finally {
      setIsSavingWebhook(false);
    }
  };

  if (!connection) {
    return (
      <form onSubmit={handleConnect} className="w-full max-w-sm flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="apiKey" className="text-sm font-medium">
            Stripe restricted API key
          </label>
          <input
            id="apiKey"
            type="text"
            required
            placeholder="rk_test_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="border rounded px-3 py-2 font-mono text-sm"
          />
          <p className="text-xs text-gray-500">
            Create one in your Stripe Dashboard under Developers → API keys →
            Create restricted key.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-black text-white rounded px-3 py-2 font-medium disabled:opacity-50"
        >
          {isSubmitting ? "Connecting..." : "Connect Stripe"}
        </button>
      </form>
    );
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-4">
      <div className="border rounded p-4 flex flex-col gap-2">
        <p className="text-sm font-medium">Stripe connected</p>
        <p className="text-sm text-gray-600">
          {connection.accountName ?? connection.stripeAccountId}
        </p>
        <button
          onClick={handleDisconnect}
          disabled={isSubmitting}
          className="border rounded px-3 py-2 text-sm font-medium mt-2 disabled:opacity-50"
        >
          Disconnect Stripe
        </button>
      </div>

      <div className="border rounded p-4 flex flex-col gap-3">
        <p className="text-sm font-medium">
          {connection.hasWebhookSecret ? "Webhook configured" : "Set up webhook"}
        </p>
        {webhookUrl && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">
              Add this as an endpoint in your Stripe Dashboard under Developers → Webhooks:
            </label>
            <code className="text-xs bg-gray-100 rounded px-2 py-1 break-all">{webhookUrl}</code>
          </div>
        )}
        <form onSubmit={handleSaveWebhookSecret} className="flex flex-col gap-2">
          <input
            type="text"
            required
            placeholder="whsec_..."
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            className="border rounded px-3 py-2 font-mono text-sm"
          />
          {webhookError && <p className="text-sm text-red-600">{webhookError}</p>}
          <button
            type="submit"
            disabled={isSavingWebhook}
            className="border rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {isSavingWebhook
              ? "Saving..."
              : connection.hasWebhookSecret
                ? "Update signing secret"
                : "Save signing secret"}
          </button>
        </form>
      </div>
    </div>
  );
}
