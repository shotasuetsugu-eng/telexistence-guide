import pg from "pg";

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL がありません。");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query("BEGIN");

  await client.query(`
    WITH wanted(name, description, icon, sort_order) AS (
      VALUES
        ('HW', 'Smartboarding HWリンク', 'book-open', 10),
        ('SW', 'Smartboarding SWリンク', 'book-open', 20),
        ('作業一般', 'Smartboarding 作業一般リンク', 'book-open', 30)
    )
    INSERT INTO categories ("name", "description", "icon", "sortOrder")
    SELECT name, description, icon, sort_order
    FROM wanted
    WHERE NOT EXISTS (
      SELECT 1 FROM categories c WHERE c.name = wanted.name
    );
  `);

  await client.query(`
    WITH wanted(category_name, title, url, content, sort_order) AS (
      VALUES
        ('HW', 'HWリンクを追加してください', '', '仮復旧用。管理者パネルから正しいSmartboardingリンクに更新してください。', 1),
        ('SW', 'SWリンクを追加してください', '', '仮復旧用。管理者パネルから正しいSmartboardingリンクに更新してください。', 1),
        ('作業一般', '作業一般リンクを追加してください', '', '仮復旧用。管理者パネルから正しいSmartboardingリンクに更新してください。', 1)
    )
    INSERT INTO procedures ("categoryId", "title", "description", "content", "sortOrder")
    SELECT c.id, w.title, w.url, w.content, w.sort_order
    FROM wanted w
    JOIN categories c ON c.name = w.category_name
    WHERE NOT EXISTS (
      SELECT 1 FROM procedures p WHERE p.title = w.title
    );
  `);

  await client.query("COMMIT");

  const result = await client.query(`
    SELECT 'categories' AS table_name, COUNT(*)::int AS count FROM categories
    UNION ALL SELECT 'procedures', COUNT(*)::int FROM procedures
    UNION ALL SELECT 'procedure_steps', COUNT(*)::int FROM procedure_steps
    ORDER BY table_name;
  `);

  console.table(result.rows);
  console.log("Smartboardingの仮復旧が完了しました。");
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error);
  process.exit(1);
} finally {
  await client.end();
}
