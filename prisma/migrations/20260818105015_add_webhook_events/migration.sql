-- AlterTable
ALTER TABLE "StripeConnection" ADD COLUMN     "encryptedWebhookSecret" TEXT;

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StripeWebhookEvent" ADD CONSTRAINT "StripeWebhookEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "StripeConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
