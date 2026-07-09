import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);
const cats = await sql`SELECT * FROM categories`;
console.log(JSON.stringify(cats, null, 2));
const procs = await sql`SELECT * FROM procedures`;
console.log(JSON.stringify(procs, null, 2));
await sql.end();
