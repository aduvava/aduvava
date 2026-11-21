-- Private, member-scoped study groups for sharing personal exams.
CREATE TABLE "StudyGroup" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "joinCode" VARCHAR(12) NOT NULL,
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudyGroup_joinCode_key" ON "StudyGroup"("joinCode");
CREATE INDEX "StudyGroup_ownerId_createdAt_idx" ON "StudyGroup"("ownerId", "createdAt");
ALTER TABLE "StudyGroup" ADD CONSTRAINT "StudyGroup_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StudyGroupMember" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudyGroupMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudyGroupMember_groupId_userId_key" ON "StudyGroupMember"("groupId", "userId");
CREATE INDEX "StudyGroupMember_userId_groupId_idx" ON "StudyGroupMember"("userId", "groupId");
ALTER TABLE "StudyGroupMember" ADD CONSTRAINT "StudyGroupMember_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "StudyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyGroupMember" ADD CONSTRAINT "StudyGroupMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StudyGroupExam" (
  "groupId" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "sharedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudyGroupExam_pkey" PRIMARY KEY ("groupId","examId")
);
CREATE INDEX "StudyGroupExam_examId_groupId_idx" ON "StudyGroupExam"("examId", "groupId");
ALTER TABLE "StudyGroupExam" ADD CONSTRAINT "StudyGroupExam_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "StudyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyGroupExam" ADD CONSTRAINT "StudyGroupExam_examId_fkey"
  FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyGroupExam" ADD CONSTRAINT "StudyGroupExam_sharedById_fkey"
  FOREIGN KEY ("sharedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
