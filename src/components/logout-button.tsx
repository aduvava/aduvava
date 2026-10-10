"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      title="Đăng xuất và về trang giới thiệu"
      aria-label="Đăng xuất"
      className="grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-orange-50 hover:text-orange-500"
    >
      <LogOut className="h-5 w-5" />
    </button>
  );
}
