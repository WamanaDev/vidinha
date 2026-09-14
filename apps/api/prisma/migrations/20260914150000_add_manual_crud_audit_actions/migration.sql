-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'CARD_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CARD_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CARD_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'TRANSACTION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TRANSACTION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'TRANSACTION_DELETED';
