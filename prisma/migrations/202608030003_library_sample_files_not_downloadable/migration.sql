UPDATE "library_product_files"
SET "downloadable" = false
WHERE "previewable" = true
  AND (
    "label" ILIKE '%sample%'
    OR "label" ILIKE '%preview%'
    OR "fileName" ILIKE '%sample%'
    OR "fileName" ILIKE '%preview%'
  );
