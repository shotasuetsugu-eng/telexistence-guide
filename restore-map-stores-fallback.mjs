import postgres from "postgres";

const rawStores = `
LAW	高輪ゲートウェイ
FM	大山田PA（再設置）
LAW	高輪ゲートウェイ17F
LAW	高輪ゲートウェイ13F
FM	相鉄さがみ野（再設置）/ Souteu Sagamino Station
FM	清瀬中里 / Kiyose Nakasato
FM	一番町
SEJ	麹町5丁目
SEJ	荒川西尾久7丁目
LAW	大阪KDDIビル
LAW	新宿KDDIビル
SEJ	甲府平和通り
SEJ	長泉下土狩西
SEJ	愛西大野町
SEJ	菰野町大羽根園
SEJ	葛飾柴又4丁目
SEJ	秦野曽屋緑下
SEJ	浅草雷門前
SEJ	川越新河岸
SEJ	つくば万博記念公園駅西
SEJ	足立加平2丁目
SEJ	厚木及川
SEJ	川島伊草
SEJ	御嵩町伏見
SEJ	瀬戸西本地町
SEJ	大阪鶴見２丁目
SEJ	前橋石倉町
SEJ	宇都宮今宮
SEJ	桑名外堀
SEJ	日野平山6丁目
SEJ	練馬南大泉5丁目
SEJ	吉祥寺南町3丁目
FM	神田淡路町
FM	八千代台南
FM	横浜神之木町
SEJ	岐阜今嶺３丁目
FM	ALFALINK相模原
FM	昭和塩付通一丁目
FM	北野高校前
SEJ	足立西新井本町4丁目
SEJ	京王山田駅前
FM	川口上青木 （再設置）
FM	神田淡路町　（再設置）
SEJ	相模原東淵野辺5丁目
SEJ	大和中央林間駅西
SEJ	久喜上内西
SEJ	日高下川崎
SEJ	西宮南昭和町
SEJ	北坂戸駅東口
SEJ	神田すずらん通り
SEJ	川崎登戸駅前
SEJ	新宿早稲田高校前店
SEJ	大阪中之島6丁目
SEJ	大阪ビジネスパーク東
SEJ	川崎有馬7丁目
SEJ	横浜森の台
SEJ	横浜東寺尾1丁目
SEJ	川崎溝の口駅前
SEJ	名古屋吹上駅前
SEJ	名古屋伏見通錦
SEJ	所沢若松町
SEJ	川崎向河原駅前店
SEJ	水戸西原
SEJ	川崎東有馬
SEJ	川崎馬絹南
`;

const chainMap = {
  SEJ: { db: "7-Eleven", query: "セブンイレブン" },
  FM: { db: "FamilyMart", query: "ファミリーマート" },
  LAW: { db: "Lawson", query: "ローソン" },
};

const fallbackLocation = { lat: "35.681236", lng: "139.767125" };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanName(value) {
  return value
    .split("/")
    [0].replace(/（再設置）|\(再設置\)|再設置/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mapsUrl(brand, name) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${brand} ${name}`)}`;
}

function fallbackQueries(brand, name) {
  const baseName = name
    .replace(/店$/, "")
    .replace(/(\d+)F$/i, "")
    .replace(/[０-９0-9]+丁目/g, "")
    .replace(/[０-９0-9]+丁目/g, "")
    .trim();

  return [
    `${brand} ${name} 日本`,
    `${name} 日本`,
    `${baseName} 日本`,
  ].filter((value, index, array) => value && array.indexOf(value) === index);
}

async function geocodeAny(queries) {
  for (const query of queries) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "jp");
    url.searchParams.set("q", query);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "telexistence-guide-map-restore/1.0 (internal data restore)",
        "Accept-Language": "ja,en",
      },
    });

    if (response.ok) {
      const rows = await response.json();
      if (Array.isArray(rows) && rows[0]?.lat && rows[0]?.lon) {
        return { query, row: rows[0] };
      }
    }

    await sleep(1100);
  }

  return null;
}

const stores = rawStores
  .trim()
  .split(/\r?\n/)
  .map((line) => {
    const [code, ...rest] = line.split(/\t+/);
    const chain = chainMap[code.trim()];
    const name = cleanName(rest.join(" "));
    return { chain, name };
  })
  .filter((item) => item.chain && item.name);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

try {
  let upserted = 0;
  let approximate = 0;

  for (const [index, store] of stores.entries()) {
    const address = mapsUrl(store.chain.query, store.name);
    const existing = await sql`
      SELECT id FROM map_stores
      WHERE chain = ${store.chain.db} AND name = ${store.name}
      LIMIT 1
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE map_stores
        SET address = ${address}, updated_at = now()
        WHERE id = ${existing[0].id}
      `;
      console.log(`[${index + 1}/${stores.length}] link updated: ${store.chain.db} ${store.name}`);
      continue;
    }

    const found = await geocodeAny(fallbackQueries(store.chain.query, store.name));
    const lat = found?.row?.lat ?? fallbackLocation.lat;
    const lng = found?.row?.lon ?? fallbackLocation.lng;
    if (!found) approximate += 1;

    await sql`
      INSERT INTO map_stores (chain, name, address, lat, lng)
      VALUES (${store.chain.db}, ${store.name}, ${address}, ${String(lat)}, ${String(lng)})
    `;

    upserted += 1;
    console.log(`[${index + 1}/${stores.length}] inserted: ${store.chain.db} ${store.name}${found ? "" : " (fallback location)"}`);
  }

  const count = await sql`SELECT COUNT(*)::int AS count FROM map_stores`;
  console.log(JSON.stringify({ upserted, approximate, totalMapStores: count[0].count }, null, 2));
} finally {
  await sql.end();
}
