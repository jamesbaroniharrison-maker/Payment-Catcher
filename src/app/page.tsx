import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="flex flex-col gap-4 max-w-xl">
        <h1 className="text-4xl font-semibold">Stop losing Skool members to failed payments</h1>
        <p className="text-gray-600">
          Every failed card is a member who wanted to stay. We catch the failure the moment it
          happens, retry it automatically when it&apos;s likely to work, and email the member when it
          isn&apos;t — so you get paid without lifting a finger.
        </p>
      </div>

      <Link
        href="/signup"
        className="bg-black text-white rounded px-6 py-3 font-medium text-lg"
      >
        Connect your Stripe account
      </Link>

      <div className="max-w-xl text-sm text-gray-500 flex flex-col gap-2">
        <p className="font-medium text-gray-700">We only get paid if it works.</p>
        <p>No setup fee, no monthly fee. We take 20% of whatever we recover — nothing if we recover nothing.</p>
      </div>

      <p className="text-xs text-gray-400">
        Already connected?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
