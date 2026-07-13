import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);

const link = 'https://www.smartboarding.jp/#/company-library';

// General(id=5)の既存procedures削除
await sql`DELETE FROM procedures WHERE "categoryId" = 5`;

const items = [
  '作業一般',
  '作業安全',
  'Field Services業務マニュアル管理要領',
  '拠点責任者業務',
  '社内向け入社トレーニング',
  'eラーニング運用要領',
  '資格運用管理要領',
  'Field Services車両運用要領',
  '部品管理実施要領',
  '社用携帯 取扱要領',
  '〈Bulletin〉委託先管理要領',
  '訪問フロー',
  'Zaico Manual',
];

let i = 1;
for (const title of items) {
  await sql`
    INSERT INTO procedures ("categoryId", title, description, content, "sortOrder")
    VALUES (5, ${title}, ${link}, ${'Smartboardingへのリンクです。'}, ${i})
  `;
  i++;
}

console.log(`Updated General category with ${items.length} items`);
await sql.end();
