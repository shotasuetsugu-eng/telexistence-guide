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

function googleMapsSearchUrl(brand, name) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${brand} ${name}`)}`;
}

async function geocode(query) {
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

  if (!response.ok) {
    throw new Error(`geocode failed: ${response.status} ${response.statusText}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] : null;
}

const stores = rawStores
  .trim()
  .split(/\r?\n/)
  .map((line) => {
    const [code, ...rest] = line.split(/\t+/);
    const chain = chainMap[code.trim()];
    const name = cleanName(rest.join(" "));
    return { code: code.trim(), chain, name };
  })
  .filter((item) => item.chain && item.name);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

const restored = [];
const failed = [];

try {
  await sql`
    CREATE TABLE IF NOT EXISTS map_stores (
      id serial PRIMARY KEY,
      chain varchar(50) NOT NULL,
      name varchar(500) NOT NULL,
      address text NOT NULL,
      lat text NOT NULL,
      lng text NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    )
  `;

  for (const [index, store] of stores.entries()) {
    const query = `${store.chain.query} ${store.name} 日本`;
    const result = await geocode(query);

    if (!result?.lat || !result?.lon) {
      failed.push({ chain: store.chain.db, name: store.name, reason: "not found" });
      console.log(`[${index + 1}/${stores.length}] not found: ${query}`);
      await sleep(1100);
      continue;
    }

    const mapsUrl = googleMapsSearchUrl(store.chain.query, store.name);
    const displayName = store.name;
    const address = result.display_name || mapsUrl;

    const existing = await sql`
      SELECT id FROM map_stores
      WHERE chain = ${store.chain.db} AND name = ${displayName}
      LIMIT 1
    `;

    if (existing.length === 0) {
      await sql`
        INSERT INTO map_stores (chain, name, address, lat, lng)
        VALUES (${store.chain.db}, ${displayName}, ${address}, ${String(result.lat)}, ${String(result.lon)})
      `;
    } else {
      await sql`
        UPDATE map_stores
        SET address = ${address}, lat = ${String(result.lat)}, lng = ${String(result.lon)}, updated_at = now()
        WHERE id = ${existing[0].id}
      `;
    }

    restored.push({
      chain: store.chain.db,
      name: displayName,
      lat: result.lat,
      lng: result.lon,
      address,
      mapsUrl,
    });
    console.log(`[${index + 1}/${stores.length}] restored: ${store.chain.db} ${displayName}`);
    await sleep(1100);
  }

  const count = await sql`SELECT COUNT(*)::int AS count FROM map_stores`;
  console.log(JSON.stringify({ restored: restored.length, failed, totalMapStores: count[0].count }, null, 2));
} finally {
  await sql.end();
}
