"use client";

import { useMemo, useState } from "react";
import {
  Clock3,
  Medal,
  MessageCircleMore,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { MascotAvatar } from "@/components/mascot-avatar";

type TimeRange = "week" | "month" | "all";
type EducationLevelId = "all" | "secondary" | "high-school" | "grade-10" | "national-exam";

type AttemptInput = {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  cosmetics?: StudentCosmetics;
  educationLevel: Exclude<EducationLevelId, "all">;
  grade: string;
  subject: string;
  score: number;
  maxScore: number;
  durationSeconds: number;
  submittedAt: string;
};

type RankedStudent = {
  id: string;
  name: string;
  image: string | null;
  cosmetics?: StudentCosmetics;
  score: number;
  durationSeconds: number;
  accuracy: number;
  attemptCount: number;
  educationLevel: Exclude<EducationLevelId, "all">;
  grade: string;
  isCurrentUser?: boolean;
};

type LeaderboardProps = {
  currentUser: {
    id: string;
    name: string;
    image: string | null;
    cosmetics?: StudentCosmetics;
    educationLevel: Exclude<EducationLevelId, "all">;
    grade: string;
  };
  subjects: string[];
  attempts: AttemptInput[];
};

type StudentCosmetics = {
  avatarFrame?: string | null;
  nameColorClass?: string | null;
  title?: string | null;
  avatarStyle?: string | null;
  avatarInitials?: string | null;
  animatedAvatar?: boolean;
};

const timeRanges: { id: TimeRange; label: string }[] = [
  { id: "week", label: "Tuần này" },
  { id: "month", label: "Tháng này" },
  { id: "all", label: "Toàn thời gian" },
];

const educationLevels: { id: EducationLevelId; label: string; grades: string[] }[] = [
  { id: "all", label: "Tất cả cấp", grades: [] },
  { id: "secondary", label: "Trung học cơ sở", grades: ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9"] },
  { id: "high-school", label: "Trung học phổ thông", grades: ["Lớp 10", "Lớp 11", "Lớp 12"] },
  { id: "grade-10", label: "Ôn thi vào 10", grades: ["Môn thi"] },
  { id: "national-exam", label: "Ôn thi THPTQG", grades: ["Môn thi"] },
];

const commonSubjects = [
  "Toán",
  "Ngữ Văn",
  "Tiếng Anh",
  "Vật Lý",
  "Hóa Học",
  "Sinh Học",
  "Lịch Sử",
  "Địa Lý",
];

const featuredDemoStudents = [
  ["Đỗ Thị H", 99, 795],
  ["Master Tiếng Anh", 98, 842],
  ["Bùi Văn G 21", 97, 925],
  ["Học bá Sinh Học 28", 96, 1636],
  ["Đặng Thị F 35", 95, 1895],
  ["Kẻ hủy diệt Hóa Học", 94, 2154],
  ["Nguyễn Minh Anh", 93, 2268],
  ["Trần Gia Huy", 92, 2380],
  ["Lê Khánh Linh", 91, 2492],
  ["Phạm Anh Tú", 90, 2620],
  ["Vũ Hoàng Nam", 89, 2734],
  ["Hà My", 88, 2850],
  ["Tuấn Kiệt", 87, 2965],
  ["Hoàng Minh Quân", 86, 3102],
  ["Đặng Thị F", 85, 3245],
] as const;

const demoFirstNames = ["Minh", "Anh", "Gia", "Huy", "Khánh", "Linh", "Hoàng", "Nam", "Thu", "Hà", "Tuấn", "Kiệt"];
const demoLastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ", "Dương"];

function createDemoStudents(
  educationLevel: EducationLevelId,
  grade: string,
  subjectKey: string,
  periodBoost: number,
): RankedStudent[] {
  const availableLevels = educationLevels.filter((item) => item.id !== "all");

  return Array.from({ length: 100 }, (_, index) => {
    const featured = featuredDemoStudents[index];
    const levelOption =
      educationLevel === "all"
        ? availableLevels[index % availableLevels.length]
        : educationLevels.find((item) => item.id === educationLevel) ?? availableLevels[0];
    const studentGrade =
      grade !== "all"
        ? grade
        : levelOption.grades[index % Math.max(levelOption.grades.length, 1)] ?? "Môn thi";
    const subjectPenalty = subjectKey === "all" ? 0 : stableOffset(`${subjectKey}-${index}`) % 4;
    const baseScore = featured?.[1] ?? Math.max(50, 94 - Math.floor((index - featuredDemoStudents.length) / 3));
    const score = Math.min(100, baseScore + periodBoost - subjectPenalty);
    const name =
      featured?.[0] ??
      `${demoLastNames[index % demoLastNames.length]} ${demoFirstNames[index % demoFirstNames.length]} ${String(index + 1).padStart(2, "0")}`;

    return {
      id: `demo-${levelOption.id}-${studentGrade}-${index + 1}`,
      name,
      image: null,
      score,
      durationSeconds: (featured?.[2] ?? 1700 + index * 31) + subjectPenalty * 19,
      accuracy: Math.max(35, score - (index % 4) * 6),
      attemptCount: 3 + (index % 8),
      educationLevel: levelOption.id as Exclude<EducationLevelId, "all">,
      grade: studentGrade,
    };
  });
}

const avatarColors = [
  "from-sky-400 to-blue-600",
  "from-violet-400 to-purple-600",
  "from-emerald-400 to-teal-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-600",
  "from-cyan-400 to-indigo-600",
];

const avatarFrameClasses: Record<string, string> = {
  "paper-crane": "ring-4 ring-sky-200 shadow-[0_0_18px_rgba(125,211,252,0.45)]",
  "butterfly-glow": "ring-4 ring-fuchsia-400 shadow-[0_0_24px_rgba(217,70,239,0.45)]",
  "gold-laurel": "ring-4 ring-amber-400 shadow-[0_0_26px_rgba(251,191,36,0.45)]",
};

const avatarStyleClasses: Record<string, string> = {
  detective: "from-amber-200 via-orange-400 to-slate-800",
  ukulele: "from-pink-200 via-rose-300 to-orange-500",
  "animated-star": "from-slate-950 via-violet-700 to-yellow-300",
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function stableOffset(value: string) {
  return Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0);
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}p ${seconds}s`;
}

function Avatar({
  student,
  size = "md",
}: {
  student: RankedStudent;
  size?: "sm" | "md" | "lg";
}) {
  const colorIndex = stableOffset(student.id) % avatarColors.length;
  const sizes = {
    sm: "h-11 w-11 text-xs",
    md: "h-16 w-16 text-base",
    lg: "h-20 w-20 text-lg sm:h-24 sm:w-24 sm:text-xl",
  };
  const frameClass = student.cosmetics?.avatarFrame ? avatarFrameClasses[student.cosmetics.avatarFrame] : "";
  const avatarStyle = student.cosmetics?.avatarStyle ? avatarStyleClasses[student.cosmetics.avatarStyle] : "";
  const avatarText = student.cosmetics?.avatarInitials || initials(student.name);
  const animatedClass = student.cosmetics?.animatedAvatar ? "animate-pulse" : "";

  if (student.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={student.image}
        alt=""
        className={clsx(sizes[size], "shrink-0 rounded-full object-cover", frameClass, animatedClass)}
      />
    );
  }

  return (
    <span
      className={clsx(
        sizes[size],
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-black text-white shadow-inner",
        avatarStyle || avatarColors[colorIndex],
        frameClass,
        animatedClass,
      )}
    >
      {avatarText}
    </span>
  );
}

function StudentName({ student, className = "" }: { student: RankedStudent; className?: string }) {
  return (
    <span className={clsx(student.cosmetics?.nameColorClass ?? "", className)}>
      {student.name}
    </span>
  );
}

function StudentTitle({ student, className = "" }: { student: RankedStudent; className?: string }) {
  if (!student.cosmetics?.title) return null;
  return (
    <span className={clsx("mt-1 inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase text-orange-600", className)}>
      {student.cosmetics.title}
    </span>
  );
}

function PodiumPlace({
  student,
  rank,
}: {
  student?: RankedStudent;
  rank: 1 | 2 | 3;
}) {
  if (!student) return null;

  const podiumStyles = {
    1: "h-24 border-amber-300 bg-gradient-to-b from-amber-50 to-yellow-200 text-amber-600 sm:h-28",
    2: "h-20 border-slate-200 bg-gradient-to-b from-slate-50 to-slate-200 text-slate-400 sm:h-24",
    3: "h-16 border-orange-200 bg-gradient-to-b from-orange-50 to-orange-200 text-orange-600 sm:h-20",
  };
  const ringStyles = {
    1: "ring-4 ring-amber-400 shadow-[0_0_32px_rgba(251,191,36,0.32)]",
    2: "ring-4 ring-slate-300",
    3: "ring-4 ring-orange-500",
  };

  return (
    <div className="flex min-w-0 flex-col items-center">
      <div className="relative">
        {rank === 1 ? (
          <Trophy className="absolute -top-8 left-1/2 h-7 w-7 -translate-x-1/2 text-amber-400" strokeWidth={2.4} />
        ) : null}
        <div className={clsx("rounded-full bg-white p-1", ringStyles[rank])}>
          <Avatar student={student} size="lg" />
        </div>
        {rank !== 1 ? (
          <span className="absolute -bottom-1 -right-2 grid h-8 w-8 place-items-center rounded-full border-[3px] border-[#fffdf0] bg-white">
            <Medal className={clsx("h-5 w-5", rank === 2 ? "text-slate-400" : "text-orange-600")} />
          </span>
        ) : null}
      </div>
      <p className="mt-4 max-w-full truncate text-center text-sm font-black text-slate-900 sm:text-base"><StudentName student={student} /></p>
      <StudentTitle student={student} />
      <p className="mt-1 text-lg font-black text-orange-600 sm:text-xl">{student.score} đ</p>
      <div
        className={clsx(
          "mt-3 flex w-full max-w-[150px] items-start justify-center rounded-t-[1.15rem] border pt-3 text-3xl font-black shadow-sm sm:text-4xl",
          podiumStyles[rank],
        )}
      >
        {rank}
      </div>
    </div>
  );
}

function ChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open ? (
        <div className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-slate-900">Hỗ trợ Ava</p>
              <p className="mt-1 text-sm text-slate-500">Bạn cần hỗ trợ về bảng xếp hạng?</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng hỗ trợ"
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <button type="button" className="mt-5 w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-extrabold text-white">
            Bắt đầu trò chuyện
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Mở hỗ trợ"
        className="fixed bottom-6 right-5 z-50 grid h-16 w-16 place-items-center overflow-hidden rounded-full border-4 border-orange-500 bg-white text-white shadow-[0_14px_35px_rgba(249,115,22,0.38)] transition hover:-translate-y-1"
      >
        {open ? <span className="grid h-full w-full place-items-center bg-orange-500"><X className="h-7 w-7" /></span> : <MascotAvatar />}
      </button>
    </>
  );
}

export function Leaderboard({ currentUser, subjects, attempts }: LeaderboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [selectedLevel, setSelectedLevel] = useState<EducationLevelId>("all");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");

  const subjectOptions = useMemo(
    () => Array.from(new Set([...commonSubjects, ...subjects])).filter(Boolean),
    [subjects],
  );
  const gradeOptions = useMemo(
    () => educationLevels.find((item) => item.id === selectedLevel)?.grades ?? [],
    [selectedLevel],
  );

  const ranking = useMemo(() => {
    const now = Date.now();
    const cutoff =
      timeRange === "week"
        ? now - 7 * 24 * 60 * 60 * 1000
        : timeRange === "month"
          ? now - 30 * 24 * 60 * 60 * 1000
          : 0;
    const filteredAttempts = attempts.filter((attempt) => {
      const inPeriod = new Date(attempt.submittedAt).getTime() >= cutoff;
      const inSubject = selectedSubject === "all" || attempt.subject === selectedSubject;
      const inLevel = selectedLevel === "all" || attempt.educationLevel === selectedLevel;
      const inGrade = selectedGrade === "all" || attempt.grade === selectedGrade;
      return inPeriod && inSubject && inLevel && inGrade;
    });

    const realStudents = new Map<string, RankedStudent>();
    for (const attempt of filteredAttempts) {
      const normalizedScore = attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0;
      const previous = realStudents.get(attempt.userId);
      const isBetter =
        !previous ||
        normalizedScore > previous.score ||
        (normalizedScore === previous.score && attempt.durationSeconds < previous.durationSeconds);

      realStudents.set(attempt.userId, {
        id: attempt.userId,
        name: attempt.userName,
        image: attempt.userImage,
        cosmetics: attempt.cosmetics,
        score: isBetter ? normalizedScore : previous.score,
        durationSeconds: isBetter ? attempt.durationSeconds : previous.durationSeconds,
        accuracy: isBetter ? normalizedScore : previous.accuracy,
        attemptCount: (previous?.attemptCount ?? 0) + 1,
        educationLevel: attempt.educationLevel,
        grade: attempt.grade,
        isCurrentUser: attempt.userId === currentUser.id,
      });
    }

    const periodBoost = timeRange === "all" ? 2 : timeRange === "month" ? 1 : 0;
    const subjectKey = selectedSubject === "all" ? "all" : selectedSubject;
    const demoRanking = createDemoStudents(selectedLevel, selectedGrade, subjectKey, periodBoost);

    const combined = [...demoRanking, ...realStudents.values()];
    const currentUserMatches =
      (selectedLevel === "all" || currentUser.educationLevel === selectedLevel) &&
      (selectedGrade === "all" || currentUser.grade === selectedGrade);
    if (!realStudents.has(currentUser.id) && currentUserMatches) {
      const subjectPenalty = selectedSubject === "all" ? 0 : stableOffset(`${subjectKey}-${currentUser.id}`) % 3;
      combined.push({
        id: currentUser.id,
        name: currentUser.name,
        image: currentUser.image,
        cosmetics: currentUser.cosmetics,
        score: 84 + periodBoost - subjectPenalty,
        durationSeconds: 25 * 60,
        accuracy: 58,
        attemptCount: 2,
        educationLevel: currentUser.educationLevel,
        grade: currentUser.grade,
        isCurrentUser: true,
      });
    }

    return combined
      .sort((first, second) => second.score - first.score || first.durationSeconds - second.durationSeconds)
      .slice(0, 100);
  }, [attempts, currentUser, selectedGrade, selectedLevel, selectedSubject, timeRange]);

  const currentIndex = ranking.findIndex((student) => student.isCurrentUser);
  const currentStudent = currentIndex >= 0 ? ranking[currentIndex] : undefined;
  const targetStudent = currentIndex > 0 ? ranking[currentIndex - 1] : undefined;
  const podium = [ranking[1], ranking[0], ranking[2]];

  return (
    <div className="leaderboard-page min-h-screen bg-[#fffdf0] pb-24">
      <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <div className="flex items-center gap-3">
            <Trophy className="h-11 w-11 text-amber-500" strokeWidth={2.3} />
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Bảng Xếp Hạng</h1>
          </div>
        </header>

        <section className="mt-7 space-y-3 rounded-[1.6rem] border border-slate-200 bg-white p-3 shadow-sm">
          <div className="overflow-x-auto rounded-2xl bg-orange-50/70 p-1.5 [scrollbar-width:thin]">
            <div className="mx-auto flex w-max min-w-full justify-start gap-2 lg:justify-center">
              {educationLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => {
                    setSelectedLevel(level.id);
                    setSelectedGrade("all");
                  }}
                  className={clsx(
                    "shrink-0 rounded-xl px-5 py-3 text-sm font-extrabold transition",
                    selectedLevel === level.id
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:text-orange-600",
                  )}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {selectedLevel !== "all" ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-1 pb-3">
              <span className="mr-1 text-xs font-black uppercase tracking-wider text-slate-400">Lớp</span>
              <button
                type="button"
                onClick={() => setSelectedGrade("all")}
                className={clsx(
                  "rounded-full border px-4 py-2 text-xs font-extrabold transition",
                  selectedGrade === "all"
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-slate-200 bg-white text-slate-600",
                )}
              >
                Tất cả lớp
              </button>
              {gradeOptions.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setSelectedGrade(grade)}
                  className={clsx(
                    "rounded-full border px-4 py-2 text-xs font-extrabold transition",
                    selectedGrade === grade
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300",
                  )}
                >
                  {grade}
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-[1fr_1.25fr]">
          <div className="grid grid-cols-3 rounded-2xl bg-slate-100 p-1.5">
            {timeRanges.map((range) => (
              <button
                key={range.id}
                type="button"
                onClick={() => setTimeRange(range.id)}
                className={clsx(
                  "rounded-xl px-3 py-3 text-xs font-extrabold transition-all sm:text-sm",
                  timeRange === range.id
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-900",
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto rounded-2xl bg-slate-100 p-1.5 [scrollbar-width:thin]">
            <button
              type="button"
              onClick={() => setSelectedSubject("all")}
              className={clsx(
                "shrink-0 rounded-xl px-5 py-3 text-sm font-extrabold transition",
                selectedSubject === "all" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900",
              )}
            >
              Tất cả môn
            </button>
            {subjectOptions.map((subject) => (
              <button
                key={subject}
                type="button"
                onClick={() => setSelectedSubject(subject)}
                className={clsx(
                  "shrink-0 rounded-xl px-5 py-3 text-sm font-extrabold transition",
                  selectedSubject === subject ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900",
                )}
              >
                {subject}
              </button>
            ))}
          </div>
          </div>
        </section>

        {currentStudent ? (
          <section className="mt-7 grid gap-4 rounded-[1.75rem] border border-orange-200 bg-white p-4 shadow-sm lg:grid-cols-[0.9fr_1.4fr]">
            <div className="rounded-[1.4rem] bg-gradient-to-br from-orange-500 to-orange-600 p-5 text-white shadow-[0_14px_30px_rgba(249,115,22,0.22)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-100">Top của bạn</p>
                  <h2 className="mt-2 text-4xl font-black">#{currentIndex + 1}</h2>
                </div>
                <Avatar student={currentStudent} size="md" />
              </div>
              <p className="mt-4 truncate text-lg font-black"><StudentName student={currentStudent} /></p>
              <StudentTitle student={currentStudent} className="bg-white/20 text-white" />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-extrabold">
                <span className="rounded-2xl bg-white/16 px-3 py-2">{currentStudent.score} điểm</span>
                <span className="rounded-2xl bg-white/16 px-3 py-2">{formatDuration(currentStudent.durationSeconds)}</span>
                <span className="rounded-2xl bg-white/16 px-3 py-2">{currentStudent.accuracy}% đúng</span>
              </div>
            </div>

            <div className="flex flex-col justify-center rounded-[1.4rem] bg-orange-50/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-black text-orange-800">
                  <Target className="h-5 w-5 text-orange-500" />
                  {targetStudent ? "Mục tiêu vượt qua" : "Bạn đang dẫn đầu"}
                </h2>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-orange-500">
                  Top {Math.min(currentIndex + 1, 100)}/100
                </span>
              </div>
              {targetStudent ? (
                <div className="mt-4 grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-white px-3 py-3 sm:grid-cols-[64px_minmax(0,1fr)_140px_70px]">
                  <span className="font-black text-slate-500">#{currentIndex}</span>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar student={targetStudent} size="sm" />
                    <span className="truncate font-extrabold text-slate-700"><StudentName student={targetStudent} /></span>
                  </div>
                  <span className="hidden items-center justify-end gap-2 text-sm text-slate-500 sm:flex">
                    <Clock3 className="h-4 w-4" /> {formatDuration(targetStudent.durationSeconds)}
                  </span>
                  <span className="text-right text-lg font-black text-orange-600">{targetStudent.score} đ</span>
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm font-bold text-slate-600">
                  Giữ phong độ hiện tại để tiếp tục đứng đầu bảng xếp hạng.
                </p>
              )}
            </div>
          </section>
        ) : null}

        <section className="mx-auto mt-14 grid max-w-2xl grid-cols-3 items-end gap-3 sm:gap-7">
          <PodiumPlace student={podium[0]} rank={2} />
          <PodiumPlace student={podium[1]} rank={1} />
          <PodiumPlace student={podium[2]} rank={3} />
        </section>

        <section className="mt-8 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <h2 className="text-xl font-black text-slate-900">Top 100 học sinh</h2>
            <span className="rounded-full bg-orange-50 px-4 py-2 text-xs font-extrabold text-orange-600">
              {ranking.length}/100
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-slate-50 text-sm font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-24 px-6 py-5">Hạng</th>
                  <th className="px-6 py-5">Học sinh</th>
                  <th className="px-6 py-5 text-center">Điểm số</th>
                  <th className="px-6 py-5 text-center">Thời gian</th>
                  <th className="px-6 py-5 text-right">Tỉ lệ đúng</th>
                </tr>
              </thead>
              <tbody>
                {ranking.slice(3, 100).map((student, index) => {
                  const rank = index + 4;
                  const isHighlighted = student.isCurrentUser;
                  return (
                    <tr
                      key={student.id}
                      className={clsx(
                        "border-t border-slate-100 transition",
                        isHighlighted ? "bg-orange-50" : "hover:bg-slate-50/70",
                      )}
                    >
                      <td className="px-6 py-5 text-center text-base font-black text-slate-500">#{rank}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <Avatar student={student} size="sm" />
                          <div className="min-w-0">
                            <p className={clsx("truncate font-black", isHighlighted ? "text-orange-600" : "text-slate-900")}>
                              <StudentName student={student} />
                              {isHighlighted ? " (Bạn)" : ""}
                            </p>
                            <StudentTitle student={student} />
                            <p className="mt-0.5 text-xs text-slate-500">
                              {student.grade} · Đã làm {student.attemptCount} đề
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center text-xl font-black text-orange-600">{student.score}</td>
                      <td className="px-6 py-5 text-center font-semibold text-slate-600">
                        {formatDuration(student.durationSeconds)}
                      </td>
                      <td className="px-6 py-5 text-right font-semibold text-slate-600">{student.accuracy}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <ChatButton />
    </div>
  );
}
