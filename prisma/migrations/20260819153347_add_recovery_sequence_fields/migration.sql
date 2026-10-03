-- AlterTable
ALTER TABLE "FailedPayment" ADD COLUMN     "day1EmailSentAt" TIMESTAMP(3),
ADD COLUMN     "day3EmailSentAt" TIMESTAMP(3),
ADD COLUMN     "finalEmailSentAt" TIMESTAMP(3);
