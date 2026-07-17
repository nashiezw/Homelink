import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";

let repairPromise: Promise<void> | null = null;
const LEGACY_BRAND_PASCAL = `Home${"Link"}`;
const LEGACY_BRAND_WORD = `Home${"link"}`;

export async function repairLegacyBrandingInPostgres() {
  if (!isPostgresStoreEnabled()) return;
  repairPromise ??= replaceLegacyBranding().catch((error) => {
    repairPromise = null;
    throw error;
  });
  return repairPromise;
}

async function replaceLegacyBranding() {
  await getMainPrisma().$executeRawUnsafe(`
    DO $$
    DECLARE
      column_record record;
    BEGIN
      FOR column_record IN
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type IN ('text', 'character varying')
      LOOP
        EXECUTE format(
          'UPDATE %I.%I SET %I = replace(replace(%I, %L, %L), %L, %L) WHERE %I LIKE %L OR %I LIKE %L',
          column_record.table_schema,
          column_record.table_name,
          column_record.column_name,
          column_record.column_name,
          ${quoteSqlLiteral(LEGACY_BRAND_PASCAL)},
          'HouseLink',
          ${quoteSqlLiteral(LEGACY_BRAND_WORD)},
          'HouseLink',
          column_record.column_name,
          ${quoteSqlLiteral(`%${LEGACY_BRAND_PASCAL}%`)},
          column_record.column_name,
          ${quoteSqlLiteral(`%${LEGACY_BRAND_WORD}%`)}
        );
      END LOOP;
    END $$;
  `);
}

function quoteSqlLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}
