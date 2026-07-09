import pg from "pg";
import fs from "fs";
import { execSync } from "child_process";

const { Client } = pg;
const xmlPath = "./render-database-urls.secret.xml";

if (!fs.existsSync(xmlPath)) {
  console.error("render-database-urls.secret.xml がありません。");
  process.exit(1);
}

const ps = "$items = Import-Clixml .\\render-database-urls.secret.xml; $items | ConvertTo-Json -Depth 5";
const raw = execSync("powershell -NoProfile -Command " + JSON.stringify(ps), { encoding: "utf8" });
const items = JSON.parse(raw);
const rows = Array.isArray(items) ? items : [items];

function mask(url) {
  return String(url || "").replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
}

async function check(label, url, config) {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 20000, ...config });
  try {
    await client.connect();
    const counts = await client.query(`
      SELECT 'map_stores' AS table_name, COUNT(*)::int AS count FROM map_stores
      UNION ALL SELECT 'deploy_schedules', COUNT(*)::int FROM deploy_schedules
      UNION ALL SELECT 'procedures', COUNT(*)::int FROM procedures
      UNION ALL SELECT 'link_settings', COUNT(*)::int FROM link_settings
      ORDER BY table_name;
    `);
    console.log(`  ${label}: OK`);
    console.table(counts.rows);

    const mapCount = counts.rows.find((row) => row.table_name === "map_stores")?.count ?? 0;
    if (mapCount > 0) {
      const stores = await client.query(`
        SELECT id, chain, name, address, lat, lng
        FROM map_stores
        ORDER BY id
        LIMIT 20;
      `);
      console.table(stores.rows);
    }
    return true;
  } catch (error) {
    console.log(`  ${label}: ${error.message}`);
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

for (const item of rows) {
  const url = item.Value;
  if (!url || !String(url).startsWith("postgres")) continue;

  console.log("\n======================================");
  console.log("Service:", item.ServiceName);
  console.log("URL:", mask(url));

  await check("ssl rejectUnauthorized false", url, { ssl: { rejectUnauthorized: false } });
  await check("ssl true", url, { ssl: true });
  await check("url only", url, {});
}
