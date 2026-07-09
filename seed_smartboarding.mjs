import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);

// 既存の3カテゴリと関連procedures削除
await sql`DELETE FROM procedures WHERE "categoryId" IN (2, 3, 4)`;
await sql`DELETE FROM categories WHERE id IN (2, 3, 4)`;

const link = 'https://www.smartboarding.jp/#/company-library';

const categoryData = [
  { name: 'General', order: 10, items: ['業務マニュアル', '作業マニュアル', 'Zaico Manual'] },
  { name: 'Retail Deployment', order: 20, items: ['Smart Shelt Deployment Manual', 'Ghost HW Deployment Manual', 'ルーター設定手順', 'IP Camera Deploy Manual'] },
  { name: 'Retail Repair', order: 30, items: ['Arm交換', 'Pillar交換', 'Mobile Base交換(440mm以上)', 'Cable Carrier交換', 'Power Control Box交換', 'Robot全交換', '動作確認・運転再開手順', 'Mobile Base交換(440mm以内)', 'IP Camera交換手順', 'Request_Teleopの解除', '作業チェックリスト'] },
  { name: 'Logi Repair', order: 40, items: [] },
  { name: 'AgiBot', order: 50, items: ['G2_作業マニュアル'] },
];

for (const cat of categoryData) {
  const [inserted] = await sql`
    INSERT INTO categories (name, description, icon, "sortOrder")
    VALUES (${cat.name}, ${'Smartboarding ' + cat.name + 'リンク'}, 'book-open', ${cat.order})
    RETURNING id
  `;
  let i = 1;
  for (const title of cat.items) {
    await sql`
      INSERT INTO procedures ("categoryId", title, description, content, "sortOrder")
      VALUES (${inserted.id}, ${title}, ${link}, ${'Smartboardingへのリンクです。'}, ${i})
    `;
    i++;
  }
  console.log(`Created category: ${cat.name} (id=${inserted.id}) with ${cat.items.length} items`);
}

await sql.end();
