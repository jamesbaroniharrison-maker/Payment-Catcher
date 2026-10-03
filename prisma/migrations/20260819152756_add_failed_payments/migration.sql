-- CreateEnum
CREATE TYPE "RetryStrategy" AS ENUM ('IMMEDIATE_RETRY', 'WAIT_AND_EMAIL');

-- CreateEnum
CREATE TYPE "FailedPaymentStatus" AS ENUM ('OPEN', 'RECOVERING', 'RECOVERED', 'ABANDONED');

-- CreateTable
CREATE TABLE "FailedPayment" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "stripeObjectId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "customerEmail" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "declineCode" TEXT,
    "failureMessage" TEXT,
    "retryStrategy" "RetryStrategy" NOT NULL,
    "status" "FailedPaymentStatus" NOT NULL DEFAULT 'OPEN',
    "lastRetryAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "recoveredCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FailedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FailedPayment_connectionId_stripeObjectId_key" ON "FailedPayment"("connectionId", "stripeObjectId");

-- AddForeignKey
ALTER TABLE "FailedPayment" ADD CONSTRAINT "FailedPayment_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "StripeConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
