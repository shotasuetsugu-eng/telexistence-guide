import pg from "pg";
const { Client } = pg;

const url = process.env.OLD_DATABASE_URL;

if (!url) {
  console.error("OLD_DATABASE_URL がありません");
  process.exit(1);
}

console.log("Checking old DB...");
console.log(url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@"));

async function tryConnect(label, config) {
  const client = new Client(config);

  try {
    console.log(`\n--- ${label} ---`);
    await client.connect();

    const result = await client.query(`
      SELECT 'categories' AS table_name, COUNT(*)::int AS count FROM categories
      UNION ALL SELECT 'procedures', COUNT(*)::int FROM procedures
      UNION ALL SELECT 'procedure_steps', COUNT(*)::int FROM procedure_steps
      UNION ALL SELECT 'checklists', COUNT(*)::int FROM checklists
      ORDER BY table_name;
    `);

    console.table(result.rows);

    const sample = await client.query(`
      SELECT c.name AS category, p.title, p.description AS url
      FROM procedures p
      LEFT JOIN categories c ON c.id = p."categoryId"
      ORDER BY c."sortOrder", p."sortOrder", p.id
      LIMIT 20;
    `);

    console.table(sample.rows);
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error(`${label} failed:`, error.message);
    await client.end().catch(() => {});
  }
}

await tryConnect("ssl object", {
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

await tryConnect("ssl true", {
  connectionString: url,
  ssl: true,
  connectionTimeoutMillis: 15000,
});

await tryConnect("url only", {
  connectionString: url,
  connectionTimeoutMillis: 15000,
});

console.error("全部失敗しました。Render DB側が停止・削除・接続不可の可能性があります。");
process.exit(1);
