INSERT INTO "library_product_files" (
  "id",
  "productId",
  "label",
  "fileUrl",
  "fileName",
  "fileType",
  "fileSizeBytes",
  "version",
  "secure",
  "previewable",
  "downloadable",
  "sortOrder",
  "active",
  "createdAt",
  "updatedAt"
)
SELECT
  'prepared-sample-real-estate-agent-training-manual',
  product."id",
  'Sample preview - HouseLink Zimbabwe Real Estate Agent Training Manual',
  '/uploads/library/samples/houselink-zimbabwe-real-estate-agent-training-manual-sample-preview.pdf',
  'houselink-zimbabwe-real-estate-agent-training-manual-sample-preview.pdf',
  'PDF',
  1438014,
  1,
  true,
  true,
  false,
  COALESCE((SELECT MAX(files."sortOrder") + 1 FROM "library_product_files" files WHERE files."productId" = product."id"), 0),
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "library_products" product
WHERE product."slug" = 'real-estate-agent-training-manual'
  AND NOT EXISTS (
    SELECT 1
    FROM "library_product_files" existing
    WHERE existing."productId" = product."id"
      AND existing."active" = true
      AND existing."previewable" = true
      AND (
        existing."label" ILIKE '%sample%'
        OR existing."label" ILIKE '%preview%'
        OR existing."fileName" ILIKE '%sample%'
        OR existing."fileName" ILIKE '%preview%'
      )
  );
