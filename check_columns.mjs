import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'deploy_schedules'`;
console.log('Columns:', cols.map(c => c.column_name));

const latest = await sql`SELECT * FROM deploy_schedules ORDER BY id DESC LIMIT 5`;
console.log('Latest 5 rows:', JSON.stringify(latest, null, 2));

await sql.end();
