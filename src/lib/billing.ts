import { prisma } from "@/lib/prisma";

/**
 * Computed on demand from recoveredAt/recoveredCents rather than kept as a
 * running counter — avoids drift between a stored total and the underlying
 * records, at the cost of a sum query. Piece 7 (monthly billing) uses this
 * same query to calculate each creator's 20% fee.
 */
export async function getMonthlyRecoveredCents(connectionId: string, reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);

  const result = await prisma.failedPayment.aggregate({
    where: {
      connectionId,
      status: "RECOVERED",
      recoveredAt: { gte: start, lt: end },
    },
    _sum: { recoveredCents: true },
  });

  return result._sum.recoveredCents ?? 0;
}
