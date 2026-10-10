"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  MessageSquare,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { defaultClassrooms, type Classroom } from "@/data/classrooms";
import { MascotAvatar } from "@/components/mascot-avatar";

type Tab = "overview" | "members" | "exams" | "analytics";
type StudentStatus = "ACTIVE" | "PENDING";
type UserRole = "STUDENT" | "TEACHER" | "ADMIN";

type Student = {
  id: string;
  code: string;
  name: string;
  email: string;
  status: StudentStatus;
};

type ClassExam = {
  id: number;
  title: string;
  type: string;
  due: string;
  submitted: number;
  status: "ONGOING" | "UPCOMING" | "ENDED";
  score: number;
  examSlug?: string;
};

type LibraryExam = {
  id: number;
  title: string;
  subject: string;
  type: string;
  duration: number;
  questions: number;
  visibility: string;
};

type SubmissionAnswer = {
  question: string;
  answer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

type StudentSubmission = {
  student: Student;
  score: number;
  submittedAt: string;
  duration: string;
  answers: SubmissionAnswer[];
};

const teacherLibraryExams: LibraryExam[] = [
  { id: 101, title: "Đề ôn tập đạo hàm 12", subject: "Toán học", type: "Trắc nghiệm", duration: 45, questions: 30, visibility: "Công khai" },
  { id: 102, title: "Đề giữa kỳ - Giải tích", subject: "Toán học", type: "Tự luận & TN", duration: 60, questions: 25, visibility: "Có mật khẩu" },
  { id: 103, title: "Đề luyện hàm số nâng cao", subject: "Toán học", type: "Trắc nghiệm", duration: 50, questions: 35, visibility: "Giới hạn email" },
  { id: 104, title: "Đề kiểm tra 15 phút chương 1", subject: "Toán học", type: "Trắc nghiệm", duration: 15, questions: 10, visibility: "Công khai" },
];

const initialStudents: Student[] = [
  { id: "1", code: "HS001", name: "Nguyễn Hoàng Nam", email: "nam.nh@gmail.com", status: "ACTIVE" },
  { id: "2", code: "HS002", name: "Trần Thị Thu Hà", email: "ha.ttt@gmail.com", status: "ACTIVE" },
  { id: "3", code: "HS003", name: "Lê Minh Đức", email: "duc.lm@gmail.com", status: "PENDING" },
  { id: "4", code: "HS004", name: "Phạm Thanh Thảo", email: "thao.pt@gmail.com", status: "ACTIVE" },
  { id: "5", code: "HS005", name: "Đỗ Gia Huy", email: "huy.dg@gmail.com", status: "ACTIVE" },
  { id: "6", code: "HS006", name: "Vũ Khánh Linh", email: "linh.vk@gmail.com", status: "ACTIVE" },
];

const scoreHistory = [
  { name: "Bài kiểm tra 15 phút - Chương 1", date: "10/04/2026", duration: "12 phút", correct: "9/10", score: 9 },
  { name: "Ôn tập kiến thức nền", date: "18/04/2026", duration: "28 phút", correct: "18/20", score: 8.8 },
  { name: "Bài thi giữa kỳ", date: "05/05/2026", duration: "43 phút", correct: "34/40", score: 7.9 },
  { name: "Luyện tập chuyên đề", date: "24/05/2026", duration: "25 phút", correct: "19/20", score: 10 },
  { name: "Kiểm tra cuối chương", date: "08/06/2026", duration: "31 phút", correct: "22/25", score: 8.4 },
];

const classScoreRows = [
  { name: "Nguyễn Hoàng Nam", average: 8.9, completed: "11/12", submitted: 11, note: "Ổn định" },
  { name: "Trần Thị Thu Hà", average: 8.6, completed: "10/12", submitted: 10, note: "Cần luyện thêm tự luận" },
  { name: "Lê Minh Đức", average: 7.8, completed: "8/12", submitted: 8, note: "Theo dõi tiến độ" },
  { name: "Phạm Thanh Thảo", average: 9.2, completed: "12/12", submitted: 12, note: "Nổi bật" },
  { name: "Đỗ Gia Huy", average: 8.1, completed: "9/12", submitted: 9, note: "Cần nộp đúng hạn" },
];

const scoreBuckets = [
  { label: "< 1", value: 0 },
  { label: "< 2", value: 1 },
  { label: "< 3", value: 2 },
  { label: "< 4", value: 3 },
  { label: "< 5", value: 5 },
  { label: ">= 5", value: 34 },
];

const questionStats = Array.from({ length: 12 }, (_, index) => {
  const total = 45;
  const done = Math.max(28, 44 - (index % 5));
  const correct = Math.max(12, done - 8 - (index % 6));
  const wrong = Math.max(0, done - correct);
  const missing = total - done;

  return {
    id: index + 1,
    questionCode: `Câu ${472558858 + index}`,
    total,
    done,
    missing,
    correct,
    wrong,
    unfinishedRate: Math.round((missing / total) * 100),
    correctStudents: ["Nguyễn Hoàng Nam", "Phạm Thanh Thảo", "Vũ Khánh Linh"].slice(0, index % 3 + 1).join(", "),
    wrongStudents: ["Trần Thị Thu Hà", "Lê Minh Đức"].slice(0, index % 2 + 1).join(", "),
    missingStudents: missing ? "Đỗ Gia Huy" : "",
  };
});

const classroomExamSlugById: Record<string, string> = {
  "toan-thay-hung-k26": "toan-review-2026",
  "luyen-de-anh-van-12": "tieng-anh-review-2026",
  "van-hoc-va-cuoc-song": "ngu-van-review-2026",
  "vat-ly-thay-minh": "vat-ly-review-2026",
};

function getClassroomExamSlug(classroom: Classroom) {
  return classroomExamSlugById[classroom.id] ?? "toan-review-2026";
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function classroomExams(classroom: Classroom): ClassExam[] {
  const topic =
    classroom.subject === "Ngữ Văn"
      ? ["Đọc hiểu văn bản", "Nghị luận xã hội", "Ôn tập tác phẩm"]
      : classroom.subject === "Tiếng Anh"
        ? ["Ngữ pháp tổng hợp", "Đọc hiểu", "Từ vựng theo chủ đề"]
        : classroom.subject === "Vật Lý"
          ? ["Dao động cơ", "Điện xoay chiều", "Sóng ánh sáng"]
          : ["Đạo hàm", "Giải tích", "Hàm số"];

  return [
    { id: 1, title: `Kiểm tra 15p - ${topic[0]}`, type: "Trắc nghiệm", due: "Hôm nay, 23:59", submitted: Math.max(1, classroom.students - 13), status: "ONGOING", score: 9, examSlug: getClassroomExamSlug(classroom) },
    { id: 2, title: `Thi giữa kỳ - ${topic[1]}`, type: "Tự luận & TN", due: "20/06/2026", submitted: 0, status: "UPCOMING", score: 0, examSlug: getClassroomExamSlug(classroom) },
    { id: 3, title: `Ôn tập chương 1 - ${topic[2]}`, type: "Trắc nghiệm", due: "30/05/2026", submitted: classroom.students, status: "ENDED", score: 8.8, examSlug: getClassroomExamSlug(classroom) },
  ];
}

function StatusBadge({ status }: { status: ClassExam["status"] }) {
  const styles = {
    ONGOING: "bg-emerald-100 text-emerald-600",
    UPCOMING: "bg-blue-100 text-blue-600",
    ENDED: "bg-slate-100 text-slate-600",
  };
  const labels = { ONGOING: "Đang diễn ra", UPCOMING: "Sắp tới", ENDED: "Đã kết thúc" };
  return <span className={clsx("rounded-lg px-3 py-2 text-[10px] font-black uppercase", styles[status])}>{labels[status]}</span>;
}

function MemberModal({
  student,
  nextCode,
  onClose,
  onSave,
}: {
  student: Student | null;
  nextCode: string;
  onClose: () => void;
  onSave: (student: Student) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    if (!name || !email) return;
    onSave({
      id: student?.id ?? crypto.randomUUID(),
      code: student?.code ?? nextCode,
      name,
      email,
      status: student?.status ?? "PENDING",
    });
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{student ? "Sửa học sinh" : "Thêm học sinh"}</h2>
            <p className="mt-1 text-sm text-slate-500">Cập nhật thông tin thành viên trong lớp.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-extrabold text-slate-700">Họ và tên</span>
            <input name="name" defaultValue={student?.name} autoFocus className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" />
          </label>
          <label className="block">
            <span className="text-sm font-extrabold text-slate-700">Email</span>
            <input name="email" type="email" defaultValue={student?.email} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" />
          </label>
          <button type="submit" className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-extrabold text-white hover:bg-orange-600">
            {student ? "Lưu thay đổi" : "Gửi lời mời"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AssignExamModal({
  classroom,
  assignedIds,
  onClose,
  onAssign,
}: {
  classroom: Classroom;
  assignedIds: number[];
  onClose: () => void;
  onAssign: (exam: LibraryExam, due: string) => void;
}) {
  const [selectedExamId, setSelectedExamId] = useState(teacherLibraryExams[0]?.id ?? 0);
  const [due, setDue] = useState("23/06/2026, 23:59");
  const selectedExam = teacherLibraryExams.find((exam) => exam.id === selectedExamId) ?? teacherLibraryExams[0];

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-orange-100 bg-orange-50/60 p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Kho đề thi của bạn</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Giao đề cho lớp {classroom.name}</h2>
            <p className="mt-2 text-sm text-slate-500">Chọn một đề đã tạo trong kho, đặt hạn nộp rồi giao cho học sinh trong lớp.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            {teacherLibraryExams.map((exam) => {
              const isAssigned = assignedIds.includes(exam.id);
              const active = selectedExamId === exam.id;
              return (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => setSelectedExamId(exam.id)}
                  className={clsx(
                    "w-full rounded-2xl border p-4 text-left transition",
                    active ? "border-orange-400 bg-orange-50 shadow-sm" : "border-slate-100 bg-white hover:border-orange-200",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-950">{exam.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {exam.subject} · {exam.type} · {exam.questions} câu · {exam.duration} phút
                      </p>
                    </div>
                    <span className={clsx("rounded-full px-3 py-1 text-[10px] font-black uppercase", isAssigned ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                      {isAssigned ? "Đã giao" : exam.visibility}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="rounded-2xl bg-slate-50 p-5">
            <h3 className="text-lg font-black text-slate-950">Thiết lập giao đề</h3>
            <label className="mt-5 block">
              <span className="text-sm font-extrabold text-slate-700">Hạn nộp</span>
              <input value={due} onChange={(event) => setDue(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400" />
            </label>
            <div className="mt-5 rounded-2xl bg-white p-4 text-sm text-slate-600">
              <p className="font-black text-slate-900">{selectedExam?.title}</p>
              <p className="mt-2">{selectedExam?.questions} câu · {selectedExam?.duration} phút</p>
              <p className="mt-1">Trạng thái: {selectedExam?.visibility}</p>
            </div>
            <button
              type="button"
              disabled={!selectedExam}
              onClick={() => selectedExam && onAssign(selectedExam, due)}
              className="mt-5 w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:bg-slate-300"
            >
              Giao đề cho lớp
            </button>
          </aside>
        </div>
      </section>
    </div>
  );
}

function buildStudentSubmissions(exam: ClassExam, students: Student[], submissionCount: number) {
  const activeStudents = students.filter((student) => student.status === "ACTIVE");
  return activeStudents.slice(0, Math.min(submissionCount, activeStudents.length)).map((student, index) => {
    const score = Math.max(5.5, Math.min(10, exam.score + ((index % 5) - 2) * 0.35));
    return {
      student,
      score: Number(score.toFixed(1)),
      submittedAt: index % 3 === 0 ? "Hôm nay, 21:18" : index % 3 === 1 ? "Hôm nay, 20:46" : "Hôm qua, 22:05",
      duration: `${12 + index * 3} phút`,
      answers: [
        {
          question: `Câu 1. Nội dung trọng tâm của ${exam.title.toLocaleLowerCase("vi")} là gì?`,
          answer: index % 2 === 0 ? "Phương án A" : "Phương án B",
          correctAnswer: "Phương án A",
          isCorrect: index % 2 === 0,
        },
        {
          question: "Câu 2. Chọn phương pháp giải phù hợp nhất.",
          answer: index % 3 === 0 ? "Phương án C" : "Phương án B",
          correctAnswer: "Phương án B",
          isCorrect: index % 3 !== 0,
        },
        {
          question: "Câu 3. Chọn nhận định chính xác trong các phương án sau.",
          answer: "Phương án D",
          correctAnswer: "Phương án D",
          isCorrect: true,
        },
      ],
    };
  });
}

function SubmissionsModal({
  exam,
  students,
  submissionCount,
  onClose,
}: {
  exam: ClassExam;
  students: Student[];
  submissionCount: number;
  onClose: () => void;
}) {
  const submissions = useMemo(() => buildStudentSubmissions(exam, students, submissionCount), [exam, students, submissionCount]);
  const [selectedId, setSelectedId] = useState(submissions[0]?.student.id ?? "");
  const selected = submissions.find((item) => item.student.id === selectedId) ?? submissions[0];

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section onMouseDown={(event) => event.stopPropagation()} className="mx-auto my-8 grid max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-orange-100 bg-orange-50/60 p-6 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Bài nộp</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">{exam.title}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{submissions.length} học sinh đã nộp bài</p>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-400 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {submissions.length ? (
              submissions.map((submission) => (
                <button
                  key={submission.student.id}
                  type="button"
                  onClick={() => setSelectedId(submission.student.id)}
                  className={clsx(
                    "flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition",
                    selected?.student.id === submission.student.id ? "border-orange-300 bg-white shadow-sm" : "border-orange-100 bg-white/65 hover:bg-white",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-black text-orange-600">{initials(submission.student.name)}</span>
                    <span className="min-w-0">
                      <strong className="block truncate text-sm text-slate-900">{submission.student.name}</strong>
                      <small className="text-slate-500">{submission.submittedAt}</small>
                    </span>
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-600">{submission.score}</span>
                </button>
              ))
            ) : (
              <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm font-bold text-slate-500">Chưa có học sinh nộp bài.</p>
            )}
          </div>
        </aside>

        <div className="p-6">
          {selected ? (
            <>
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-950">{selected.student.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{selected.student.code} · {selected.student.email}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-orange-50 px-4 py-3">
                    <p className="text-xs font-black uppercase text-orange-500">Điểm</p>
                    <p className="text-2xl font-black text-slate-950">{selected.score}</p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 px-4 py-3">
                    <p className="text-xs font-black uppercase text-blue-500">Thời gian</p>
                    <p className="text-sm font-black text-slate-950">{selected.duration}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-black uppercase text-emerald-500">Đúng</p>
                    <p className="text-2xl font-black text-slate-950">{selected.answers.filter((answer) => answer.isCorrect).length}/{selected.answers.length}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {selected.answers.map((answer, index) => (
                  <article key={answer.question} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="font-black text-slate-900">{answer.question}</h4>
                      <span className={clsx("shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase", answer.isCorrect ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")}>
                        {answer.isCorrect ? "Đúng" : "Sai"}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <p className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-600">Bài làm: <span className="text-slate-950">{answer.answer}</span></p>
                      <p className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-600">Đáp án đúng: <span className="text-emerald-600">{answer.correctAnswer}</span></p>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-slate-500">Nhận xét câu {index + 1}: {answer.isCorrect ? "Nắm chắc kiến thức." : "Cần xem lại phương pháp giải và lời giải chi tiết."}</p>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ExamManagementModal({ exam, onClose }: { exam: ClassExam; onClose: () => void }) {
  const sampleQuestions = [
    `Câu 1. Nội dung trọng tâm của ${exam.title.toLocaleLowerCase("vi")} là gì?`,
    "Câu 2. Chọn phương pháp giải phù hợp nhất.",
    "Câu 3. Chọn nhận định chính xác trong các phương án sau.",
  ];

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section onMouseDown={(event) => event.stopPropagation()} className="mx-auto my-8 max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-orange-100 bg-orange-50/60 p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Quản lí đề</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{exam.title}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Xem nội dung đề, thông số cơ bản và các cài đặt của bài thi.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Loại đề", exam.type],
                ["Hạn nộp", exam.due],
                ["Đã nộp", String(exam.submitted)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-black uppercase text-slate-400">{label}</p>
                  <p className="mt-2 font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">Nội dung đề thi</h3>
              <div className="mt-4 space-y-3">
                {sampleQuestions.map((question) => (
                  <article key={question} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-extrabold text-slate-800">{question}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {["Phương án A", "Phương án B", "Phương án C", "Phương án D"].map((option, index) => (
                        <span key={option} className={clsx("rounded-xl border px-3 py-2 text-sm font-bold", index === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500")}>
                          {option}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-[2rem] bg-slate-50 p-6">
            <h3 className="text-lg font-black text-slate-950">Cài đặt bài thi</h3>
            <div className="mt-5 space-y-3">
              {["Cho phép xem đáp án sau khi nộp", "Tự động chấm điểm", "Nhắc học sinh chưa nộp", "Khóa bài sau hạn nộp"].map((setting) => (
                <label key={setting} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700">
                  <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-slate-300 accent-orange-500" />
                  {setting}
                </label>
              ))}
            </div>
            <label className="mt-5 block">
              <span className="text-sm font-extrabold text-slate-700">Thời lượng</span>
              <input defaultValue={exam.type.includes("15") ? "15 phút" : "45 phút"} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400" />
            </label>
            <button type="button" onClick={onClose} className="mt-5 w-full rounded-2xl bg-orange-500 px-5 py-3.5 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600">
              Lưu cài đặt
            </button>
          </aside>
        </div>
      </section>
    </div>
  );
}

function RadarChart({ subject }: { subject: string }) {
  const labels =
    subject === "Ngữ Văn"
      ? ["Đọc hiểu", "Nghị luận", "Văn học", "Diễn đạt", "Lập luận"]
      : subject === "Tiếng Anh"
        ? ["Ngữ pháp", "Từ vựng", "Đọc hiểu", "Phát âm", "Giao tiếp"]
        : ["Đại số", "Giải tích", "Hình học", "Xác suất", "Lượng giác"];
  const points = "160,48 244,113 213,218 106,225 72,116";

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[390px]">
      <svg viewBox="0 0 320 300" className="h-full w-full overflow-visible">
        {[1, 0.75, 0.5, 0.25].map((scale) => {
          const polygon = [[160, 35], [281, 123], [235, 265], [85, 265], [39, 123]]
            .map(([x, y]) => `${160 + (x - 160) * scale},${150 + (y - 150) * scale}`)
            .join(" ");
          return <polygon key={scale} points={polygon} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {[35, 123, 265, 265, 123].map((y, index) => {
          const x = [160, 281, 235, 85, 39][index];
          return <line key={index} x1="160" y1="150" x2={x} y2={y} stroke="#e2e8f0" />;
        })}
        <polygon points={points} fill="rgba(249,115,22,0.48)" stroke="#f97316" strokeWidth="2" />
        {labels.map((label, index) => {
          const positions = [[160, 16], [294, 124], [250, 286], [64, 286], [20, 124]];
          return (
            <text key={label} x={positions[index][0]} y={positions[index][1]} textAnchor="middle" className="fill-slate-500 text-[11px] font-bold">
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function ClassroomDetail({
  classroomId,
  currentUserName,
  currentUserRole,
}: {
  classroomId: string;
  currentUserName: string;
  currentUserRole: UserRole;
}) {
  const router = useRouter();
  const [classroom, setClassroom] = useState<Classroom | null>(
    defaultClassrooms.find((item) => item.id === classroomId) ?? null,
  );
  const [loaded, setLoaded] = useState(Boolean(classroom));
  const [tab, setTab] = useState<Tab>("overview");
  const [students, setStudents] = useState(initialStudents);
  const [memberSearch, setMemberSearch] = useState("");
  const [editingStudent, setEditingStudent] = useState<Student | null | undefined>(undefined);
  const [announcement, setAnnouncement] = useState("");
  const [posts, setPosts] = useState([
    {
      id: 1,
      author: "Thầy cô phụ trách",
      time: "2 giờ trước",
      content: "Chào các em, tối nay 8h lớp sẽ mở đề thi thử chuyên đề mới. Các em nhớ ôn tập kỹ công thức trước khi làm bài. Chúc các em đạt điểm cao!",
      comments: 12,
    },
  ]);
  const [submissionExam, setSubmissionExam] = useState<{ exam: ClassExam; count: number } | null>(null);
  const [managedExam, setManagedExam] = useState<ClassExam | null>(null);
  const [assignExamOpen, setAssignExamOpen] = useState(false);
  const [assignedExams, setAssignedExams] = useState<ClassExam[]>([]);
  const [assignedLibraryExamIds, setAssignedLibraryExamIds] = useState<number[]>([]);
  const [submittedExams] = useState<number[]>([]);
  const [toast, setToast] = useState("");
  const isTeacherMode = currentUserRole === "TEACHER" || currentUserRole === "ADMIN";

  const tabs: { id: Tab; label: string; icon: typeof MessageSquare }[] = [
    { id: "overview", label: "Tổng quan", icon: MessageSquare },
    { id: "members", label: "Thành viên", icon: Users },
    { id: "exams", label: isTeacherMode ? "Quản lí bài thi" : "Bài thi & Trắc nghiệm", icon: BookOpen },
    { id: "analytics", label: isTeacherMode ? "Bảng điểm lớp" : "Bảng điểm & Thống kê", icon: BarChart3 },
  ];

  useEffect(() => {
    if (!classroom) {
      try {
        const custom = JSON.parse(window.localStorage.getItem("slowedu-custom-classrooms") ?? "[]") as Classroom[];
        setClassroom(custom.find((item) => item.id === classroomId) ?? null);
      } finally {
        setLoaded(true);
      }
    }
  }, [classroom, classroomId]);

  const baseExams = useMemo(() => (classroom ? classroomExams(classroom) : []), [classroom]);
  const exams = useMemo(() => [...assignedExams, ...baseExams], [assignedExams, baseExams]);
  const filteredStudents = students.filter((student) =>
    `${student.code} ${student.name} ${student.email}`.toLocaleLowerCase("vi").includes(memberSearch.toLocaleLowerCase("vi")),
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function publishAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!announcement.trim()) return;
    setPosts((items) => [
      { id: Date.now(), author: currentUserName, time: "Vừa xong", content: announcement.trim(), comments: 0 },
      ...items,
    ]);
    setAnnouncement("");
  }

  function saveStudent(student: Student) {
    setStudents((items) => {
      const exists = items.some((item) => item.id === student.id);
      return exists ? items.map((item) => (item.id === student.id ? student : item)) : [...items, student];
    });
    setEditingStudent(undefined);
    showToast(student.status === "PENDING" ? "Đã gửi lời mời cho học sinh." : "Đã cập nhật học sinh.");
  }

  function openClassExam(exam: ClassExam, submitted: boolean) {
    if (submitted) {
      showToast(`Bạn đã đạt ${exam.score || 9} điểm.`);
      return;
    }
    if (!classroom) return;
    const title = encodeURIComponent(exam.title);
    router.push(`/exams/${exam.examSlug ?? getClassroomExamSlug(classroom)}?classTitle=${title}`);
  }

  function updateStudentStatus(id: string, status: StudentStatus) {
    setStudents((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
    showToast(status === "ACTIVE" ? "Đã duyệt học sinh vào lớp." : "Đã cập nhật trạng thái.");
  }

  function assignLibraryExamToClass(exam: LibraryExam, due: string) {
    if (assignedLibraryExamIds.includes(exam.id)) {
      showToast("Đề này đã được giao cho lớp.");
      return;
    }

    setAssignedExams((items) => [
      {
        id: Date.now(),
        title: exam.title,
        type: exam.type,
        due,
        submitted: 0,
        status: "UPCOMING",
        score: 0,
        examSlug: classroom ? getClassroomExamSlug(classroom) : "toan-review-2026",
      },
      ...items,
    ]);
    setAssignedLibraryExamIds((items) => [...items, exam.id]);
    setAssignExamOpen(false);
    showToast(`Đã giao "${exam.title}" cho lớp ${classroom?.name ?? ""}.`);
  }

  if (!loaded) return <div className="classroom-detail-page min-h-screen bg-[#fffdf0]" />;
  if (!classroom) {
    return (
      <div className="classroom-detail-page min-h-screen bg-[#fffdf0] px-4 py-20 text-center">
        <h1 className="text-2xl font-black text-slate-900">Không tìm thấy lớp học</h1>
        <Link href="/classes" className="mt-6 inline-flex rounded-2xl bg-orange-500 px-5 py-3 font-bold text-white">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const analyticsCards = isTeacherMode
    ? [
        ["Số người đăng ký thi", String(classroom.students), "Toàn bộ học sinh trong lớp", "text-blue-600"],
        ["Tổng lượt làm", "156", "Tính trên các đề đã giao", "text-emerald-600"],
        ["Số người chưa thi và đang thi", "13", "Cần nhắc trước hạn nộp", "text-rose-500"],
        ["Số thí sinh đạt điểm < 1", "0", "Không có học sinh ở nhóm cảnh báo đỏ", "text-amber-500"],
        ["Số thí sinh đạt điểm ≥ 5", "39", "86% học sinh vượt ngưỡng đạt", "text-blue-600"],
      ]
    : [
        ["Điểm trung bình của bạn", "8.8", "+ 0.3 so với lớp", "text-emerald-500"],
        ["Tỷ lệ hoàn thành bài", "100%", "Đã làm tất cả bài tập", "text-emerald-500"],
        ["Xếp hạng trong lớp", "Top 5", "Cố gắng lên nhé!", "text-slate-400"],
      ];

  return (
    <div className="classroom-detail-page min-h-screen bg-[#fffdf0] pb-24">
      <header className="border-b border-orange-100 bg-white">
        <div className="mx-auto flex max-w-[1640px] items-center justify-between gap-4 px-4 py-5 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-4">
            <Link href={isTeacherMode ? "/teacher?tab=classes" : "/classes"} aria-label="Quay lại" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-black text-slate-950 sm:text-xl">{classroom.name}</h1>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(classroom.code);
                    showToast("Đã sao chép mã lớp.");
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white"
                >
                  Mã: {classroom.code} <Copy className="h-3 w-3" />
                </button>
              </div>
              <p className="truncate text-sm font-medium text-slate-500">{classroom.teacher}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Thông báo lớp" className="relative grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <button type="button" aria-label="Tùy chọn" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1640px] gap-2 overflow-x-auto px-4 sm:px-7 lg:px-10">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" onClick={() => setTab(item.id)} className={clsx("flex shrink-0 items-center gap-2 border-b-2 px-3 py-4 text-sm font-extrabold transition sm:px-5", tab === item.id ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-800")}>
                <Icon className="h-5 w-5" /> {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-[1640px] px-4 py-8 sm:px-7 lg:px-10">
        {tab === "overview" ? (
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_430px]">
            <div>
              <form onSubmit={publishAnnouncement} className="flex items-center gap-4 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-orange-100 font-black text-orange-600">{initials(currentUserName)}</span>
                <input value={announcement} onChange={(event) => setAnnouncement(event.target.value)} placeholder="Chia sẻ thông báo hoặc nhắc nhở với lớp..." className="min-w-0 flex-1 rounded-full bg-slate-50 px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-100" />
                <button type="submit" aria-label="Đăng thông báo" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-orange-500 text-white disabled:bg-slate-300" disabled={!announcement.trim()}>
                  <Send className="h-5 w-5" />
                </button>
              </form>
              <div className="mt-7 space-y-5">
                {posts.map((post) => (
                  <article key={post.id} className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex items-center gap-4">
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-blue-100 font-black text-blue-600">{initials(post.author)}</span>
                      <div>
                        <h2 className="font-black text-slate-950 sm:text-lg">{post.author}</h2>
                        <p className="text-xs text-slate-400">{post.time}</p>
                      </div>
                    </div>
                    <p className="mt-6 text-sm leading-7 text-slate-700 sm:text-base">{post.content}</p>
                    <button type="button" onClick={() => showToast("Khu vực bình luận đã được mở.")} className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-5 text-sm font-bold text-slate-500 hover:text-orange-600">
                      <MessageSquare className="h-5 w-5" /> {post.comments} bình luận
                    </button>
                  </article>
                ))}
              </div>
            </div>
            <aside className="rounded-[2rem] border border-orange-100 bg-white p-7 shadow-sm">
              <h2 className="text-xl font-black uppercase text-slate-950">Tóm tắt tình hình</h2>
              <div className="mt-7 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
                  <p className="text-xs font-black uppercase text-orange-600">Học sinh</p>
                  <p className="mt-2 text-4xl font-black text-slate-950">{classroom.students}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <p className="text-xs font-black uppercase text-blue-600">Bài tập mới</p>
                  <p className="mt-2 text-4xl font-black text-slate-950">{classroom.newAssignments}</p>
                </div>
              </div>
              <h3 className="mt-8 text-sm font-black uppercase text-slate-400">Hoạt động gần nhất</h3>
              <div className="mt-5 space-y-5">
                {[
                  ["Nam Nguyễn", "đã nộp bài tập", "10 phút trước"],
                  ["Hà Trần", "đã tham gia lớp học", "1 giờ trước"],
                  ["Đức Lê", "đã bình luận trong bảng tin", "2 giờ trước"],
                ].map(([name, action, time]) => (
                  <div key={name} className="flex gap-3">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
                    <div>
                      <p className="text-sm text-slate-600">
                        <strong className="text-slate-900">{name}</strong> {action}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        ) : null}

        {tab === "members" ? (
          <section>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-slate-950">Danh sách học sinh</h2>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-500">{students.length} thành viên</span>
              </div>
              {isTeacherMode ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Tìm theo tên, mã HS..." className="w-56 bg-transparent text-sm outline-none" />
                  </label>
                  <button type="button" onClick={() => setEditingStudent(null)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-extrabold text-white">
                    <UserPlus className="h-5 w-5" /> Thêm học sinh
                  </button>
                </div>
              ) : null}
            </div>
            <div className="mt-7 overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400">
                    <tr>
                      <th className="px-6 py-5">Mã HS</th>
                      <th className="px-6 py-5">Họ tên</th>
                      <th className="px-6 py-5">Email</th>
                      <th className="px-6 py-5">Trạng thái</th>
                      {isTeacherMode ? <th className="px-6 py-5 text-right">Thao tác</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="border-t border-slate-100">
                        <td className="px-6 py-5 text-sm font-extrabold text-slate-500">{student.code}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <span className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-400">{initials(student.name)}</span>
                            <strong>{student.name}</strong>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-500">{student.email}</td>
                        <td className="px-6 py-5">
                          <span className={clsx("rounded-full px-3 py-1.5 text-[10px] font-black uppercase", student.status === "ACTIVE" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600")}>
                            {student.status === "ACTIVE" ? "Đang học" : "Chờ duyệt"}
                          </span>
                        </td>
                        {isTeacherMode ? (
                          <td className="px-6 py-5">
                            <div className="flex justify-end gap-2">
                              {student.status === "PENDING" ? (
                                <>
                                  <button type="button" onClick={() => updateStudentStatus(student.id, "ACTIVE")} aria-label="Duyệt" className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-50">
                                    <CheckCircle2 className="h-5 w-5" />
                                  </button>
                                  <button type="button" onClick={() => setStudents((items) => items.filter((item) => item.id !== student.id))} aria-label="Từ chối" className="rounded-lg p-2 text-rose-500 hover:bg-rose-50">
                                    <XCircle className="h-5 w-5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button type="button" onClick={() => setEditingStudent(student)} aria-label="Sửa" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                                    <Pencil className="h-5 w-5" />
                                  </button>
                                  <button type="button" onClick={() => setStudents((items) => items.filter((item) => item.id !== student.id))} aria-label="Xóa" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "exams" ? (
          <section>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-slate-950">{isTeacherMode ? "Quản lí bài thi" : "Bài thi & Trắc nghiệm"}</h2>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-500">{classroom.assignments} bài thi</span>
              </div>
              {isTeacherMode ? (
                <button type="button" onClick={() => setAssignExamOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white">
                  <Plus className="h-4 w-4" /> Giao đề từ kho
                </button>
              ) : null}
            </div>
            <div className="mt-7 grid gap-6 lg:grid-cols-3">
              {exams.map((exam, index) => {
                const submitted = submittedExams.includes(exam.id);
                const submissionCount = Math.min(classroom.students, exam.submitted + (submitted ? 1 : 0));
                return (
                  <article key={exam.id} className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between">
                      <span className={clsx("grid h-16 w-16 place-items-center rounded-2xl", index === 0 ? "bg-orange-50 text-orange-500" : index === 1 ? "bg-blue-50 text-blue-500" : "bg-slate-50 text-slate-500")}>
                        <FileText className="h-7 w-7" />
                      </span>
                      <StatusBadge status={submitted && !isTeacherMode ? "ENDED" : exam.status} />
                    </div>
                    <h3 className="mt-6 text-lg font-black text-slate-950">{exam.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{exam.type}</p>
                    <div className="mt-6 border-t border-slate-100 pt-5 text-xs font-extrabold uppercase text-slate-400">
                      <div className="flex justify-between">
                        <span>Hạn nộp</span>
                        <strong className="text-slate-900">{exam.due}</strong>
                      </div>
                      <div className="mt-4 flex justify-between">
                        <span>Đã nộp</span>
                        <strong className="text-slate-900">{submissionCount}/{classroom.students}</strong>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-orange-500" style={{ width: `${(submissionCount / classroom.students) * 100}%` }} />
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      {isTeacherMode ? (
                        <>
                          <button type="button" onClick={() => setSubmissionExam({ exam, count: submissionCount })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-3 text-xs font-black uppercase text-white">
                            <Users className="h-4 w-4" /> Xem bài nộp
                          </button>
                          <button type="button" onClick={() => setManagedExam(exam)} className="rounded-xl bg-slate-50 px-3 py-3 text-xs font-black uppercase text-slate-600">
                            Quản lí đề
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => openClassExam(exam, submitted)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-3 text-xs font-black uppercase text-white">
                            <Play className="h-4 w-4 fill-current" /> {submitted ? "Xem bài" : "Làm bài ngay"}
                          </button>
                          <button type="button" onClick={() => showToast(exam.score ? `Kết quả gần nhất: ${exam.score} điểm.` : "Chưa có kết quả cho bài thi này.")} className="rounded-xl bg-slate-50 px-3 py-3 text-xs font-black uppercase text-slate-600">
                            Kết quả
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {tab === "analytics" ? (
          <section>
            <div className={clsx("grid gap-3 md:grid-cols-3", isTeacherMode && "lg:grid-cols-5")}>
              {analyticsCards.map(([label, value, note, color]) => (
                <div key={label} className="rounded-[1.35rem] border border-orange-100 bg-white p-4 shadow-sm">
                  <p className="min-h-8 text-[10px] font-black uppercase leading-4 tracking-wide text-slate-400">{label}</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
                  <p className={clsx("mt-2 text-xs font-extrabold leading-5", color)}>{note}</p>
                </div>
              ))}
            </div>
            {isTeacherMode ? (
              <>
                <section className="mt-7 overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-6">
                    <h2 className="flex items-center gap-3 text-lg font-black text-slate-950">
                      <FileText className="h-5 w-5 text-emerald-600" /> Xuất dữ liệu thống kê sang Excel
                    </h2>
                  </div>
                  <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-3">
                      {["Thống kê phổ điểm", "Thống kê tỉ lệ đúng/sai theo câu hỏi", "Bảng điểm"].map((label) => (
                        <label key={label} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                          <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-slate-300 accent-blue-600" />
                          {label}
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast("Đã chuẩn bị tệp Excel thống kê lớp.")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      <FileText className="h-5 w-5" /> Xuất tập tin Excel
                    </button>
                  </div>
                </section>

                <section className="mt-10">
                  <h2 className="text-xl font-black uppercase text-slate-950">Thống kê phổ điểm</h2>
                  <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_0.8fr]">
                    <article className="rounded-[2rem] border border-orange-100 bg-white shadow-sm">
                      <div className="border-b border-slate-100 p-6">
                        <h3 className="flex items-center gap-3 text-lg font-black text-slate-950">
                          <BarChart3 className="h-5 w-5 text-blue-600" /> Biểu đồ phổ điểm
                        </h3>
                      </div>
                      <div className="p-6">
                        <h4 className="text-center text-lg font-black text-slate-800">Thống kê điểm thi_{classroom.subject}</h4>
                        <div className="mt-8 flex h-72 items-end justify-around gap-3 border-b border-l border-dashed border-slate-200 px-5">
                          {scoreBuckets.map((bucket) => (
                            <div key={bucket.label} className="flex h-full flex-1 flex-col items-center justify-end">
                              <span className="mb-2 text-xs font-black text-slate-700">{bucket.value}</span>
                              <div
                                className="w-full max-w-16 rounded-t-xl bg-blue-600 transition hover:bg-orange-500"
                                style={{ height: `${Math.max(4, bucket.value * 7)}%` }}
                              />
                              <span className="mt-3 text-xs font-bold text-slate-400">{bucket.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>
                    <article className="rounded-[2rem] border border-orange-100 bg-white shadow-sm">
                      <div className="border-b border-slate-100 p-6">
                        <h3 className="flex items-center gap-3 text-lg font-black text-slate-950">
                          <BarChart3 className="h-5 w-5 text-violet-600" /> Thống kê
                        </h3>
                      </div>
                      <div className="space-y-4 p-6">
                        {scoreBuckets.map((bucket) => {
                          const maxValue = Math.max(...scoreBuckets.map((item) => item.value), 1);
                          return (
                            <div key={bucket.label} className="grid grid-cols-[50px_1fr_32px] items-center gap-3 text-sm font-bold text-slate-700">
                              <span>{bucket.label}</span>
                              <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <span className="block h-full rounded-full bg-orange-500" style={{ width: `${(bucket.value / maxValue) * 100}%` }} />
                              </span>
                              <span className="text-right">{bucket.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  </div>
                </section>

                <section className="mt-10 overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-6">
                    <h2 className="text-lg font-black text-slate-950">Thống kê tỉ lệ đúng/sai theo câu hỏi</h2>
                  </div>
                  <div className="max-h-[520px] overflow-auto">
                    <table className="w-full min-w-[1280px] border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-black uppercase text-slate-500">
                        <tr>
                          {[
                            "STT",
                            "ID câu hỏi",
                            "Tổng số HS dự thi",
                            "Số HS đã làm",
                            "Số HS chưa làm",
                            "Số HS làm đúng",
                            "Số HS làm sai",
                            "Tỷ lệ HS không hoàn thành/câu",
                            "Học sinh làm đúng",
                            "Học sinh làm sai",
                            "Học sinh chưa làm",
                          ].map((heading) => (
                            <th key={heading} className="border-r border-slate-100 px-5 py-4 last:border-r-0">{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {questionStats.map((row) => (
                          <tr key={row.id} className="border-t border-slate-100 text-sm">
                            <td className="px-5 py-4 font-black text-slate-500">{row.id}</td>
                            <td className="px-5 py-4 font-extrabold text-slate-700">{row.questionCode}</td>
                            <td className="px-5 py-4 font-black text-slate-700">{row.total}</td>
                            <td className="px-5 py-4 font-black text-blue-600">{row.done}</td>
                            <td className="px-5 py-4 font-black text-amber-600">{row.missing}</td>
                            <td className="px-5 py-4 font-black text-emerald-600">{row.correct}</td>
                            <td className="px-5 py-4 font-black text-rose-600">{row.wrong}</td>
                            <td className="px-5 py-4 font-bold text-slate-600">{row.unfinishedRate}%</td>
                            <td className="px-5 py-4 text-slate-600">{row.correctStudents || "-"}</td>
                            <td className="px-5 py-4 text-slate-600">{row.wrongStudents || "-"}</td>
                            <td className="px-5 py-4 text-slate-600">{row.missingStudents || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : null}
            <div className="mt-7 grid gap-7 xl:grid-cols-2">
              <div className="rounded-[2rem] border border-orange-100 bg-white p-7 shadow-sm">
                <h2 className="text-lg font-black uppercase text-slate-950">{isTeacherMode ? "Biểu đồ điểm số của lớp" : "Biểu đồ điểm số cá nhân"}</h2>
                <div className="mt-8 flex h-72 items-end justify-around gap-3 border-b border-l border-dashed border-slate-200 px-5">
                  {scoreHistory.map((item, index) => (
                    <div key={item.name} className="flex h-full flex-1 flex-col items-center justify-end">
                      <span className="mb-2 text-xs font-black text-orange-600">{item.score}</span>
                      <div className="w-full max-w-14 rounded-t-xl bg-orange-500 transition hover:bg-orange-600" style={{ height: `${item.score * 9}%` }} />
                      <span className="mt-3 text-xs font-bold text-slate-400">Bài {index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[2rem] border border-orange-100 bg-white p-7 shadow-sm">
                <h2 className="text-lg font-black uppercase text-slate-950">{isTeacherMode ? "Phân tích kỹ năng của lớp" : "Phân tích kỹ năng cá nhân"}</h2>
                <RadarChart subject={classroom.subject} />
              </div>
            </div>
            <div className="mt-7 overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-sm">
              <h2 className="p-7 text-lg font-black uppercase text-slate-950">{isTeacherMode ? "Bảng điểm học sinh" : "Lịch sử làm bài chi tiết"}</h2>
              <div className="overflow-x-auto">
                {isTeacherMode ? (
                  <table className="w-full min-w-[840px] border-collapse text-left">
                    <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400">
                      <tr>
                        <th className="px-6 py-5">Học sinh</th>
                        <th className="px-6 py-5">Điểm TB</th>
                        <th className="px-6 py-5">Hoàn thành</th>
                        <th className="px-6 py-5">Bài đã nộp</th>
                        <th className="px-6 py-5 text-orange-500">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classScoreRows.map((item) => (
                        <tr key={item.name} className="border-t border-slate-100">
                          <td className="px-6 py-5 font-extrabold text-slate-900">{item.name}</td>
                          <td className="px-6 py-5 text-lg font-black text-orange-600">{item.average}</td>
                          <td className="px-6 py-5 text-slate-600">{item.completed}</td>
                          <td className="px-6 py-5 text-slate-600">{item.submitted}</td>
                          <td className="px-6 py-5 text-slate-600">{item.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full min-w-[840px] border-collapse text-left">
                    <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400">
                      <tr>
                        <th className="px-6 py-5">Tên bài kiểm tra</th>
                        <th className="px-6 py-5">Ngày làm bài</th>
                        <th className="px-6 py-5">Thời gian làm</th>
                        <th className="px-6 py-5">Số câu đúng</th>
                        <th className="px-6 py-5 text-orange-500">Điểm số</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreHistory.map((item) => (
                        <tr key={item.name} className="border-t border-slate-100">
                          <td className="px-6 py-5 font-extrabold text-slate-900">{item.name}</td>
                          <td className="px-6 py-5 text-slate-600">{item.date}</td>
                          <td className="px-6 py-5 text-slate-600">{item.duration}</td>
                          <td className="px-6 py-5 text-slate-600">{item.correct}</td>
                          <td className="px-6 py-5 text-lg font-black text-orange-600">{item.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      {editingStudent !== undefined ? <MemberModal student={editingStudent} nextCode={`HS${String(students.length + 1).padStart(3, "0")}`} onClose={() => setEditingStudent(undefined)} onSave={saveStudent} /> : null}
      {assignExamOpen ? (
        <AssignExamModal
          classroom={classroom}
          assignedIds={assignedLibraryExamIds}
          onClose={() => setAssignExamOpen(false)}
          onAssign={assignLibraryExamToClass}
        />
      ) : null}
      {submissionExam ? (
        <SubmissionsModal
          exam={submissionExam.exam}
          students={students}
          submissionCount={submissionExam.count}
          onClose={() => setSubmissionExam(null)}
        />
      ) : null}
      {managedExam ? <ExamManagementModal exam={managedExam} onClose={() => setManagedExam(null)} /> : null}
      {toast ? (
        <div className="fixed bottom-7 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl">
          <Check className="h-4 w-4 text-emerald-400" /> {toast}
        </div>
      ) : null}
      <button type="button" onClick={() => showToast("Đã mở kênh hỗ trợ lớp học.")} aria-label="Hỗ trợ" className="fixed bottom-6 right-5 z-50 grid h-16 w-16 place-items-center overflow-hidden rounded-full border-4 border-orange-500 bg-white shadow-[0_14px_35px_rgba(249,115,22,0.38)] transition hover:-translate-y-1">
        <MascotAvatar />
      </button>
    </div>
  );
}


