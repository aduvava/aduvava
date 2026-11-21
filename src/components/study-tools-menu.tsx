"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpenCheck, ChartNoAxesColumn, ChevronDown, UsersRound } from "lucide-react";

const studyTools = [
  {
    href: "/nhom-hoc",
    label: "Nhóm học tập",
    description: "Cùng bạn bè chia sẻ và luyện đề",
    Icon: UsersRound,
  },
  {
    href: "/so-loi-sai",
    label: "Sổ lỗi sai",
    description: "Ôn lại câu bạn từng sai",
    Icon: BookOpenCheck,
  },
  {
    href: "/nang-luc",
    label: "Bản đồ năng lực",
    description: "Biết phần nào cần cải thiện",
    Icon: ChartNoAxesColumn,
  },
];

export function StudyToolsMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={compact ? "Mở công cụ ôn tập" : undefined}
        aria-expanded={open}
        aria-controls={compact ? "mobile-study-tools" : "desktop-study-tools"}
        onClick={() => setOpen((current) => !current)}
        className={
          compact
            ? "grid h-10 w-10 place-items-center rounded-full text-slate-600 transition hover:bg-orange-50 hover:text-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
            : "inline-flex items-center gap-1 whitespace-nowrap font-bold text-slate-600 transition hover:text-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
        }
      >
        {compact ? <BookOpenCheck className="h-5 w-5" aria-hidden="true" /> : "Ôn tập"}
        {!compact ? <ChevronDown className={"h-3.5 w-3.5 transition " + (open ? "rotate-180" : "")} aria-hidden="true" /> : null}
      </button>
      {open ? (
        <nav
          id={compact ? "mobile-study-tools" : "desktop-study-tools"}
          aria-label="Công cụ ôn tập"
          className={
            "absolute top-full z-[90] mt-3 w-64 overflow-hidden rounded-2xl border border-orange-100 bg-white p-2 text-slate-900 shadow-[0_18px_48px_rgba(15,23,42,0.16)] " +
            (compact ? "right-0" : "left-0")
          }
        >
          {studyTools.map(({ href, label, description, Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-orange-50 focus-visible:bg-orange-50 focus-visible:outline-none"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-extrabold">{label}</span>
                <span className="mt-0.5 block text-xs font-medium text-slate-500">{description}</span>
              </span>
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
