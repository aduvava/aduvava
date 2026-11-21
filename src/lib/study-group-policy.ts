export function isShareablePersonalExam(
  exam: { ownerId: string | null; code: string; isPublished: boolean } | null,
  userId: string,
) {
  return Boolean(exam && exam.ownerId === userId && exam.isPublished && exam.code.startsWith("USER-"));
}

export function canRemoveGroupExam(
  userId: string,
  groupOwnerId: string,
  sharedById: string,
) {
  return userId === groupOwnerId || userId === sharedById;
}
