import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

const result = await sql`SELECT count(*) FROM deploy_schedules`;
console.log('deploy_schedules count:', result[0].count);

const latest = await sql`SELECT id, day_plan, end_date, image_url FROM deploy_schedules ORDER BY id DESC LIMIT 5`;
console.log('Latest 5 rows:', latest);

await sql.end();
