import postgres from "postgres";

const stores = [
  {
    chain: "Lawson",
    name: "高輪ゲートウェイ",
    lat: "35.6353990",
    lng: "139.7406642",
    address: "https://www.google.com/maps/search/?api=1&query=%E3%83%AD%E3%83%BC%E3%82%BD%E3%83%B3%20%E9%AB%98%E8%BC%AA%E3%82%B2%E3%83%BC%E3%83%88%E3%82%A6%E3%82%A7%E3%82%A4",
  },
  {
    chain: "Lawson",
    name: "高輪ゲートウェイ17F",
    lat: "35.6353990",
    lng: "139.7406642",
    address: "https://www.google.com/maps/search/?api=1&query=%E3%83%AD%E3%83%BC%E3%82%BD%E3%83%B3%20%E9%AB%98%E8%BC%AA%E3%82%B2%E3%83%BC%E3%83%88%E3%82%A6%E3%82%A7%E3%82%A417F",
  },
];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

try {
  for (const store of stores) {
    const existing = await sql`
      SELECT id FROM map_stores
      WHERE chain = ${store.chain} AND name = ${store.name}
      LIMIT 1
    `;

    if (existing.length === 0) {
      await sql`
        INSERT INTO map_stores (chain, name, address, lat, lng)
        VALUES (${store.chain}, ${store.name}, ${store.address}, ${store.lat}, ${store.lng})
      `;
      console.log("inserted", store.chain, store.name);
    } else {
      await sql`
        UPDATE map_stores
        SET address = ${store.address}, lat = ${store.lat}, lng = ${store.lng}, updated_at = now()
        WHERE id = ${existing[0].id}
      `;
      console.log("updated", store.chain, store.name);
    }
  }

  const counts = await sql`
    SELECT chain, COUNT(*)::int AS count
    FROM map_stores
    GROUP BY chain
    ORDER BY chain
  `;
  const total = await sql`SELECT COUNT(*)::int AS count FROM map_stores`;
  console.log(JSON.stringify({ counts, total: total[0].count }, null, 2));
} finally {
  await sql.end();
}
