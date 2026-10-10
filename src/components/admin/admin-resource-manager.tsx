"use client";

import { useCallback, useEffect, useState } from "react";

type AdminItem = { id?: string; title?: string; name?: string; email?: string; slug?: string; status?: string } & Record<string, unknown>;

export function AdminResourceManager({ resource, defaultPayload }: { resource: string; defaultPayload: Record<string, unknown> }) {
  const [items, setItems] = useState<AdminItem[]>([]);
  const [payload, setPayload] = useState(JSON.stringify(defaultPayload, null, 2));
  const [updateId, setUpdateId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/${resource}`);
    const data = await response.json();
    setItems(data.items ?? []);
  }, [resource]);

  useEffect(() => {
    load();
  }, [load]);

  async function createItem() {
    setMessage("Đang tạo...");
    const response = await fetch(`/api/admin/${resource}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
    setMessage(response.ok ? "Đã tạo" : "Tạo thất bại. Kiểm tra JSON và khóa ngoại.");
    if (response.ok) load();
  }

  async function updateItem() {
    if (!updateId) return setMessage("Nhập ID cần cập nhật.");
    setMessage("Đang cập nhật...");
    const response = await fetch(`/api/admin/${resource}/${updateId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: payload });
    setMessage(response.ok ? "Đã cập nhật" : "Cập nhật thất bại.");
    if (response.ok) load();
  }

  async function deleteItem(id?: string) {
    if (!id) return;
    const response = await fetch(`/api/admin/${resource}/${id}`, { method: "DELETE" });
    setMessage(response.ok ? "Đã xóa" : "Xóa thất bại. Có thể dữ liệu đang bị ràng buộc.");
    if (response.ok) load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div className="rounded-[1.75rem] border border-ink/10 bg-white p-5 shadow-lifted">
        <h2 className="font-display text-2xl font-black text-ink">JSON editor</h2>
        <p className="mt-2 text-sm text-ink/60">CRUD tối giản để seed và chỉnh dữ liệu v1. Form chi tiết có thể tách sau khi schema ổn định.</p>
        <textarea
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          className="mt-4 min-h-80 w-full rounded-2xl border border-ink/10 bg-sand p-4 font-mono text-xs outline-none focus:border-moss"
        />
        <input
          value={updateId}
          onChange={(event) => setUpdateId(event.target.value)}
          placeholder="ID để cập nhật"
          className="mt-3 w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-moss"
        />
        <div className="mt-4 flex gap-3">
          <button onClick={createItem} className="rounded-full bg-moss px-4 py-2 text-sm font-bold text-white">
            Create
          </button>
          <button onClick={updateItem} className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white">
            Update
          </button>
        </div>
        {message ? <p className="mt-3 text-sm font-semibold text-ink/65">{message}</p> : null}
      </div>
      <div className="rounded-[1.75rem] border border-ink/10 bg-white p-5 shadow-lifted">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-black text-ink">{resource}</h2>
          <button onClick={load} className="rounded-full bg-sand px-4 py-2 text-sm font-bold text-ink">
            Reload
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <div key={String(item.id)} className="rounded-2xl border border-ink/10 bg-paper p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-ink">{String(item.title ?? item.name ?? item.email ?? item.slug ?? item.id)}</p>
                  <p className="mt-1 break-all font-mono text-xs text-ink/50">{String(item.id)}</p>
                  {item.status ? <p className="mt-1 text-xs font-bold text-moss">{String(item.status)}</p> : null}
                </div>
                <button onClick={() => deleteItem(item.id)} className="rounded-full bg-clay px-3 py-2 text-xs font-bold text-white">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!items.length ? <p className="rounded-2xl bg-sand p-4 text-sm text-ink/60">Chưa có dữ liệu hoặc chưa seed database.</p> : null}
        </div>
      </div>
    </div>
  );
}
