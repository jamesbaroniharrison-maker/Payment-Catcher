-- CreateEnum
CREATE TYPE "BillingInvoiceStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "PlatformCustomer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "defaultPaymentMethodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInvoice" (
    "id" TEXT NOT NULL,
    "platformCustomerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "recoveredCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "stripePaymentIntentId" TEXT,
    "status" "BillingInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformCustomer_userId_key" ON "PlatformCustomer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformCustomer_stripeCustomerId_key" ON "PlatformCustomer"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_platformCustomerId_periodStart_key" ON "BillingInvoice"("platformCustomerId", "periodStart");

-- AddForeignKey
ALTER TABLE "PlatformCustomer" ADD CONSTRAINT "PlatformCustomer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_platformCustomerId_fkey" FOREIGN KEY ("platformCustomerId") REFERENCES "PlatformCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
