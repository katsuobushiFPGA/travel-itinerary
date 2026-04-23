-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "coverImage" TEXT;
ALTER TABLE "Trip" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Trip_shareToken_key" ON "Trip"("shareToken");

-- AlterTable
ALTER TABLE "ItineraryItem" ADD COLUMN "url" TEXT;
