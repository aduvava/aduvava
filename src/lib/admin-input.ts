import { z } from "zod";

// Explicit, strict field lists block Prisma mass-assignment and nested writes
// (including passwordHash, coins, exp, arbitrary relation connects, and IDs).
const id = z.string().trim().min(1).max(200);
const text = (max = 1000) => z.string().max(max);
const positiveInt = z.number().int().nonnegative();
const optionalText = (max = 1000) => text(max).nullable();
const dateTime = z.string().datetime({ offset: true }).nullable();
const answerOption = z.object({
  label: text(20),
  content: text(20000),
  isCorrect: z.boolean().optional(),
}).strict();

const schemas = {
  subjects: z.object({
    slug: text(160), name: text(200),
    family: z.enum(["THPTQG", "DGNL"]),
    description: text(10000), color: text(30), icon: text(100),
  }),
  exams: z.object({
    code: text(100), slug: text(200), title: text(250),
    description: text(20000), family: z.enum(["THPTQG", "DGNL"]),
    type: z.enum(["MOCK", "PREDICTION", "PRACTICE"]),
    contentMode: z.enum(["TOPIC", "EXAM"]),
    accessLevel: z.enum(["FREE", "PRO"]),
    year: z.number().int().min(2000).max(2200),
    durationMinutes: z.number().int().min(1).max(600),
    educationLevel: z.enum(["THCS", "THPT", "EXAM_10", "THPTQG"]).nullable(),
    grade: z.string().trim().max(50).nullable(),
    specialExamTrack: z.enum(["HSA", "TSA", "V_ACT", "QDA", "BQA", "DGNL_BCA"]).nullable(),
    targetScore: z.number().finite().nonnegative().nullable(),
    subjectId: id, isPublished: z.boolean(),
  }),
  questions: z.object({
    examId: id, topicId: id.nullable(),
    position: positiveInt, type: z.enum(["SINGLE_CHOICE", "TRUE_FALSE_SET", "SHORT_ANSWER", "ESSAY"]),
    prompt: text(50000), passage: optionalText(50000),
    points: z.number().finite().nonnegative(), correctText: optionalText(20000),
    explanation: optionalText(50000),
    answerOptions: z.array(answerOption).max(20),
  }),
  blogs: z.object({
    slug: text(200), title: text(250), excerpt: text(2000),
    content: text(200000), coverImage: optionalText(2000),
    status: z.enum(["DRAFT", "PUBLISHED"]), publishedAt: dateTime,
  }),
  users: z.object({
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    name: text(120).nullable(),
    role: z.enum(["STUDENT", "TEACHER", "ADMIN"]),
    password: z.string().min(8).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password must be at most 72 UTF-8 bytes"),
  }),
  subscriptions: z.object({
    userId: id, planId: id,
    status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]),
    startsAt: dateTime, endsAt: dateTime,
  }),
  payments: z.object({
    userId: id, planId: id, amount: positiveInt,
    status: z.enum(["PENDING", "PAID", "FAILED"]),
    provider: text(200), reference: text(250), checkoutUrl: optionalText(2000),
  }),
  plans: z.object({
    slug: text(200), name: text(200), description: text(10000),
    price: positiveInt, interval: z.enum(["MONTH", "QUARTER", "YEAR"]),
    features: z.array(text(1000)).max(100), isActive: z.boolean(),
  }),
  "store-items": z.object({
    slug: z.string().trim().min(1).max(200), name: z.string().trim().min(1).max(200), description: text(10000),
    category: z.enum(["EQUIPMENT", "HELP", "STUDY_PACK", "GIFT", "AVATAR"]),
    price: positiveInt, currency: z.enum(["COIN", "EXP"]),
    imageKey: text(200), badge: optionalText(200),
    isFeatured: z.boolean(), isConsumable: z.boolean(), isActive: z.boolean(),
    stock: positiveInt.nullable(), sortOrder: z.number().int(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
  }),
  "theory-chapters": z.object({
    subjectId: id, educationLevel: z.enum(["THCS", "THPT", "EXAM_10", "THPTQG"]).nullable(),
    grade: optionalText(50), slug: text(200), title: text(250),
    description: optionalText(20000), position: z.number().int(), isPublished: z.boolean(),
  }),
  "theory-lessons": z.object({
    chapterId: id, slug: text(200), title: text(250),
    summary: optionalText(3000), content: text(200000),
    position: z.number().int(), accessLevel: z.enum(["FREE", "PRO"]),
    isPublished: z.boolean(),
  }),
} as const;

type Resource = keyof typeof schemas;
type Mode = "create" | "update";

// Admin editor sends partial JSON on updates. Unknown keys are rejected, not ignored.
export function parseAdminInput(resource: string, input: unknown, mode: Mode): Record<string, unknown> {
  if (!Object.prototype.hasOwnProperty.call(schemas, resource)) {
    throw new Error("Unknown admin resource");
  }
  // Payment amounts, ownership, plan and references are immutable once
  // created. A status change MUST run through the atomic VIP service.
  if (resource === "payments") {
    if (mode === "update") {
      return z.object({ status: z.enum(["PENDING", "PAID", "FAILED"]) }).strict().parse(input);
    }
    const created = schemas.payments.partial().strict().parse(input);
    z.object({ status: z.literal("PENDING").optional() })
      .parse({ status: created.status });
    return created;
  }
  if (resource === "store-items" && mode === "create") {
    // Creating a shop item needs its required fields. The old generic
    // .partial() accepted missing values and Prisma surfaced a 500 instead
    // of a useful 400 response.
    return schemas["store-items"].extend({
      metadata: schemas["store-items"].shape.metadata.optional(),
      badge: schemas["store-items"].shape.badge.optional(),
      stock: schemas["store-items"].shape.stock.optional(),
    }).strict().parse(input);
  }
  const selected = schemas[resource as Resource];
  if (resource === "users") {
    const userSchema = schemas.users;
    if (mode === "create") {
      return userSchema.strict().parse(input);
    }
    return userSchema.omit({ password: true }).partial().strict().parse(input);
  }
  const base = selected as z.ZodObject<z.ZodRawShape>;
  const output = base.partial().strict().parse(input);
  if (mode === "update" && Object.keys(output).length === 0) {
    throw new Error("Update payload cannot be empty");
  }
  return output;
}
