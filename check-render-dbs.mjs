import pg from "pg";
import fs from "fs";
import { execSync } from "child_process";

const { Client } = pg;

const xmlPath = "./render-database-urls.secret.xml";

if (!fs.existsSync(xmlPath)) {
  console.error("render-database-urls.secret.xml がありません。先に find-render-database-urls.ps1 を実行してください。");
  process.exit(1);
}

const ps = "$items = Import-Clixml .\\render-database-urls.secret.xml; $items | ConvertTo-Json -Depth 5";

const raw = execSync("powershell -NoProfile -Command " + JSON.stringify(ps), { encoding: "utf8" });
const items = JSON.parse(raw);
const rows = Array.isArray(items) ? items : [items];

function mask(url) {
  return String(url || "").replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
}

for (const item of rows) {
  const url = item.Value;
  if (!url || !String(url).startsWith("postgres")) continue;

  console.log("\n======================================");
  console.log("Service:", item.ServiceName);
  console.log("Key:", item.Key);
  console.log("URL:", mask(url));

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });

  try {
    await client.connect();

    const count = await client.query(`
      SELECT 'categories' AS table_name, COUNT(*)::int AS count FROM categories
      UNION ALL SELECT 'procedures', COUNT(*)::int FROM procedures
      UNION ALL SELECT 'procedure_steps', COUNT(*)::int FROM procedure_steps
      UNION ALL SELECT 'checklists', COUNT(*)::int FROM checklists
      UNION ALL SELECT 'map_stores', COUNT(*)::int FROM map_stores
      UNION ALL SELECT 'deploy_schedules', COUNT(*)::int FROM deploy_schedules
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
    const mapStoresCount = count.rows.find((r) => r.table_name === "map_stores")?.count ?? 0;

    if (proceduresCount > 0) {
      console.log("★ このDBにSmartboarding候補があります:", item.ServiceName);
    }

    if (mapStoresCount > 0) {
      console.log("★ このDBにマップ店舗候補があります:", item.ServiceName);
      const stores = await client.query(`
        SELECT id, chain, name, address, lat, lng
        FROM map_stores
        ORDER BY id
        LIMIT 10;
      `);
      console.table(stores.rows);
    }

    if (proceduresCount === 0 && mapStoresCount === 0) {
      console.log("このDBには procedures / map_stores がありません。");
    }
  } catch (error) {
    console.error("接続失敗:", error.message);
  } finally {
    await client.end().catch(() => {});
  }
}
