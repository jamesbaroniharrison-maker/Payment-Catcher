import { NextResponse } from "next/server";
import { runMonthlyBilling } from "@/lib/monthly-billing";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMonthlyBilling();
  return NextResponse.json(result);
}
