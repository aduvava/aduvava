// Shared by Next.js, the standalone admin and the deployment command.
const catalog = require('../data/subject-catalog.json');

async function ensureSubjectCatalog(db) {
  const existing = await db.subject.findMany({ select: { slug: true } });
  const slugs = new Set(existing.map((subject) => subject.slug));
  const missing = catalog.filter((subject) => !slugs.has(subject.slug));
  if (missing.length) {
    await db.subject.createMany({
      data: missing.map(({ image, groups, ...subject }) => subject),
      skipDuplicates: true,
    });
  }
}
module.exports = { ensureSubjectCatalog };
