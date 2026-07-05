import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const scalarTypeHints = {
  String: ["text", "character varying", "uuid"],
  Int: ["integer"],
  BigInt: ["bigint"],
  Float: ["double precision", "real"],
  Decimal: ["numeric"],
  Boolean: ["boolean"],
  DateTime: ["timestamp without time zone", "timestamp with time zone"],
  Json: ["jsonb", "json"],
  Bytes: ["bytea"],
};

async function main() {
  if (!isPostgres(process.env.DATABASE_URL)) {
    throw new Error("DATABASE_URL must point to PostgreSQL before running the production audit.");
  }

  const [columns, enums, indexes] = await Promise.all([
    prisma.$queryRaw`
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `,
    prisma.$queryRaw`
      SELECT t.typname AS enum_name, e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `,
    prisma.$queryRaw`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
    `,
  ]);

  const columnMap = new Map(columns.map((column) => [`${column.table_name}.${column.column_name}`, column]));
  const enumMap = new Map();
  for (const row of enums) {
    const values = enumMap.get(row.enum_name) ?? [];
    values.push(row.enum_value);
    enumMap.set(row.enum_name, values);
  }

  const issues = [];
  for (const model of Prisma.dmmf.datamodel.models) {
    if (!columns.some((column) => column.table_name === model.dbName || column.table_name === model.name)) {
      issues.push({ severity: "error", model: model.name, issue: "missing table" });
      continue;
    }

    const tableName = model.dbName ?? model.name;
    for (const field of model.fields) {
      if (field.kind === "object") continue;
      const columnName = field.dbName ?? field.name;
      const column = columnMap.get(`${tableName}.${columnName}`);
      if (!column) {
        issues.push({ severity: "error", model: model.name, field: field.name, issue: "missing column" });
        continue;
      }
      if (field.isRequired && !field.isList && !field.hasDefaultValue && column.is_nullable === "YES") {
        issues.push({ severity: "warn", model: model.name, field: field.name, issue: "required field is nullable in database" });
      }
      if (field.isList && !column.udt_name.startsWith("_")) {
        issues.push({ severity: "warn", model: model.name, field: field.name, issue: "list field is not an array column" });
      }
      if (field.kind === "scalar" && !field.isList) {
        const expected = scalarTypeHints[field.type];
        if (expected && !expected.includes(column.data_type)) {
          issues.push({
            severity: "warn",
            model: model.name,
            field: field.name,
            issue: `type differs: Prisma ${field.type}, database ${column.data_type}`,
          });
        }
      }
    }
  }

  for (const prismaEnum of Prisma.dmmf.datamodel.enums) {
    const actual = enumMap.get(prismaEnum.name) ?? [];
    for (const value of prismaEnum.values) {
      if (!actual.includes(value.name)) {
        issues.push({ severity: "error", enum: prismaEnum.name, value: value.name, issue: "missing enum value" });
      }
    }
  }

  for (const model of Prisma.dmmf.datamodel.models) {
    const tableName = model.dbName ?? model.name;
    for (const field of model.fields.filter((candidate) => candidate.isUnique || candidate.isId)) {
      const columnName = field.dbName ?? field.name;
      const hasIndex = indexes.some((index) => (
        index.tablename === tableName &&
        (index.indexdef.includes(`"${columnName}"`) || index.indexdef.includes(`(${columnName})`))
      ));
      if (!hasIndex) {
        issues.push({ severity: "warn", model: model.name, field: field.name, issue: "missing unique/id index" });
      }
    }
  }

  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    database: redactDatabaseUrl(process.env.DATABASE_URL),
    modelsChecked: Prisma.dmmf.datamodel.models.length,
    enumsChecked: Prisma.dmmf.datamodel.enums.length,
    issueCount: issues.length,
    issues,
  }, null, 2));

  if (issues.some((issue) => issue.severity === "error")) {
    process.exitCode = 1;
  }
}

function isPostgres(value = "") {
  return value.startsWith("postgresql://") || value.startsWith("postgres://");
}

function redactDatabaseUrl(value = "") {
  try {
    const url = new URL(value);
    if (url.password) url.password = "****";
    if (url.username) url.username = "****";
    return url.toString();
  } catch {
    return "unparseable";
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
