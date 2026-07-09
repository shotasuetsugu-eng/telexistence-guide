import pg from "pg";
const { Client } = pg;

if (!process.env.OLD_DATABASE_URL) {
  console.error("OLD_DATABASE_URL がありません");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.OLD_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

try {
  console.log("旧DBに接続中...");
  await client.connect();

  const count = await client.query(`
    SELECT 'categories' AS table_name, COUNT(*)::int AS count FROM categories
    UNION ALL SELECT 'procedures', COUNT(*)::int FROM procedures
    UNION ALL SELECT 'procedure_steps', COUNT(*)::int FROM procedure_steps
    UNION ALL SELECT 'checklists', COUNT(*)::int FROM checklists
    ORDER BY table_name;
  `);

  console.table(count.rows);

  const sample = await client.query(`
    SELECT c.name AS category, p.title, p.description AS url
    FROM procedures p
    LEFT JOIN categories c ON c.id = p."categoryId"
    ORDER BY c."sortOrder", p."sortOrder", p.id
    LIMIT 30;
  `);

  console.table(sample.rows);

  const proceduresCount = count.rows.find((r) => r.table_name === "procedures")?.count ?? 0;

  if (proceduresCount > 0) {
    console.log("★ 旧DBにSmartboarding候補があります。復元できます。");
  } else {
    console.log("旧DBにも procedures がありません。");
  }
} catch (error) {
  console.error("旧DB確認エラー:", error.message);
} finally {
  await client.end().catch(() => {});
}
