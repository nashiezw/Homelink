-- Rebrand database-facing identifiers from HomeLink to HouseLink.
-- Historical migrations remain unchanged; this migration moves existing databases forward.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'LeadSource'
      AND e.enumlabel = 'HOMELINK'
  ) THEN
    ALTER TYPE "LeadSource" RENAME VALUE 'HOMELINK' TO 'HOUSELINK';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AgentCommissionRule'
      AND column_name = 'homelinkSplitPercent'
  ) THEN
    ALTER TABLE "AgentCommissionRule"
      RENAME COLUMN "homelinkSplitPercent" TO "houselinkSplitPercent";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AgentCommissionRecord'
      AND column_name = 'homelinkAmount'
  ) THEN
    ALTER TABLE "AgentCommissionRecord"
      RENAME COLUMN "homelinkAmount" TO "houselinkAmount";
  END IF;
END $$;
