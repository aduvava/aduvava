"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function InviteSignOutButton({ code }: { code: string }) {
  const [pending, setPending] = useState(false);

  async function startNewRegistration() {
    setPending(true);
    try {
      // Sign out intentionally, then re-open the signed referral endpoint.
      // This avoids signing up while an administrator's session is still active.
      await signOut({ callbackUrl: "/r/" + code });
    } catch {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void startNewRegistration()}
      className="mt-4 w-full rounded-xl bg-orange-500 px-5 py-3 font-black text-white hover:bg-orange-600 disabled:opacity-60"
    >
      {pending ? "Đang đăng xuất..." : "Đăng xuất để tạo tài khoản học sinh mới"}
    </button>
  );
}
