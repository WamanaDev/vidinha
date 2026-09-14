-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "pluggyAccountId" TEXT;

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "connectionId" TEXT,
ADD COLUMN     "pluggyAccountId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Account_pluggyAccountId_key" ON "Account"("pluggyAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_pluggyAccountId_key" ON "Card"("pluggyAccountId");

-- CreateIndex
CREATE INDEX "Card_connectionId_idx" ON "Card"("connectionId");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "OpenFinanceConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

