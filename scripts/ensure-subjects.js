const { PrismaClient } = require('@prisma/client');
const { ensureSubjectCatalog } = require('../src/lib/subject-catalog.js');
const db = new PrismaClient();
ensureSubjectCatalog(db)
  .then(() => console.log('Danh mục môn học đã sẵn sàng. Dữ liệu hiện có được giữ nguyên.'))
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
