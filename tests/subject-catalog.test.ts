import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ensureSubjectCatalog } from '../src/lib/subject-catalog.js';
import catalog from '../src/data/subject-catalog.json';

test('subject initialization fills missing rows without overwriting custom names or IDs', async () => {
  const rows = [{ id: 'existing-math', slug: 'toan', name: 'Toán của trường' }, { id: 'custom', slug: 'custom-subject', name: 'Môn tự chọn' }];
  let writes = 0;
  const db = { subject: {
    findMany: async () => rows,
    createMany: async ({ data, skipDuplicates }: { data: Array<{slug: string; name: string}>; skipDuplicates: boolean }) => {
      assert.equal(skipDuplicates, true);
      writes++;
      for (const row of data) rows.push({ ...row, id: row.slug });
    },
  } };
  await ensureSubjectCatalog(db);
  await ensureSubjectCatalog(db);
  assert.equal(writes, 1);
  assert.equal(rows.find((row) => row.slug === 'toan')?.name, 'Toán của trường');
  assert.equal(rows.find((row) => row.slug === 'toan')?.id, 'existing-math');
  assert.equal(rows.length, catalog.length + 1);
});

test('every catalog illustration exists in public assets and slugs are unique', () => {
  assert.equal(new Set(catalog.map((item) => item.slug)).size, catalog.length);
  for (const item of catalog) {
    if (item.image) assert.ok(existsSync(`public${item.image}`), item.image);
  }
});
