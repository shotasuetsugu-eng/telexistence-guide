import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString: process.env.OLD_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const result = await client.query(`
  SELECT 'categories' AS table_name, COUNT(*)::int AS count FROM categories
  UNION ALL SELECT 'procedures', COUNT(*)::int FROM procedures
  UNION ALL SELECT 'procedure_steps', COUNT(*)::int FROM procedure_steps
  UNION ALL SELECT 'checklists', COUNT(*)::int FROM checklists
  ORDER BY table_name;
`);

console.table(result.rows);
await client.end();
