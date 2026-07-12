CREATE TABLE IF NOT EXISTS "ListingVirtualTour" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "provider" TEXT NOT NULL DEFAULT 'INTERNAL',
  "externalUrl" TEXT,
  "coverSceneId" TEXT,
  "adminVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ListingVirtualTour_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VirtualTourScene" (
  "id" TEXT NOT NULL,
  "tourId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "hotspots" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VirtualTourScene_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ListingVirtualTour_listingId_key" ON "ListingVirtualTour"("listingId");
CREATE INDEX IF NOT EXISTS "ListingVirtualTour_status_idx" ON "ListingVirtualTour"("status");
CREATE INDEX IF NOT EXISTS "VirtualTourScene_tourId_sortOrder_idx" ON "VirtualTourScene"("tourId", "sortOrder");

ALTER TABLE "ListingVirtualTour"
  ADD CONSTRAINT "ListingVirtualTour_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VirtualTourScene"
  ADD CONSTRAINT "VirtualTourScene_tourId_fkey"
  FOREIGN KEY ("tourId") REFERENCES "ListingVirtualTour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
