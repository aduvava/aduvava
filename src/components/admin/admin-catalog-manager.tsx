"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, RefreshCw, Search, Trash2, X } from "lucide-react";

type Resource = "subjects" | "store-items" | "users";
type FieldKind = "text" | "textarea" | "number" | "select" | "checkbox" | "password" | "email";
type FieldDef = { key: string; title: string; kind: FieldKind; required?: boolean; max?: number; options?: [string, string][]; tip?: string };
type Item = { id: string; name?: string | null; email?: string; role?: string; slug?: string; family?: string; category?: string; price?: number; currency?: string;
  isActive?: boolean; metadata?: unknown; _count?: { exams?: number; topics?: number; theoryChapters?: number; theoryArticles?: number; purchases?: number } } & Record<string, unknown>;
type FormValues = Record<string, string | boolean>;

const families: [string, string][] = [["THPTQG", "Học tập và thi THPT"], ["DGNL", "Đánh giá năng lực"]];
const categories: [string, string][] = [["EQUIPMENT", "Trang bị"], ["HELP", "Hỗ trợ"], ["STUDY_PACK", "Gói học tập"], ["GIFT", "Quà tặng"], ["AVATAR", "Ảnh đại diện"]];
const roles: [string, string][] = [["STUDENT", "Học sinh"], ["TEACHER", "Giáo viên"], ["ADMIN", "Quản trị viên"]];
const fields: Record<Resource, FieldDef[]> = {
  subjects: [
    { key: "name", title: "Tên môn học", kind: "text", max: 200, required: true },
    { key: "slug", title: "Đường dẫn (slug, không trùng)", kind: "text", max: 160, required: true, tip: "Ví dụ: toan, vat-ly. Đổi slug sẽ thay đổi đường dẫn cũ." },
    { key: "family", title: "Nhóm môn", kind: "select", options: families, required: true },
    { key: "description", title: "Mô tả", kind: "textarea", max: 10000 },
    { key: "color", title: "Màu hiển thị (mã HEX)", kind: "text", max: 30, tip: "Ví dụ: #f97316" },
    { key: "icon", title: "Biểu tượng", kind: "text", max: 100, tip: "Ví dụ: book-open, atom, calculator" },
  ],
  "store-items": [
    { key: "name", title: "Tên vật phẩm", kind: "text", max: 200, required: true },
    { key: "slug", title: "Đường dẫn (slug)", kind: "text", max: 200, required: true, tip: "Không trùng vật phẩm khác, ví dụ: khung-avatar-cam" },
    { key: "description", title: "Mô tả vật phẩm", kind: "textarea", max: 10000 },
    { key: "category", title: "Danh mục", kind: "select", options: categories },
    { key: "price", title: "Giá", kind: "number", required: true },
    { key: "currency", title: "Đơn vị", kind: "select", options: [["EXP", "EXP"], ["COIN", "Coin"]] },
    { key: "imageKey", title: "Mã màu / hình vật phẩm", kind: "text", max: 200, tip: "Ví dụ: orange, blue, purple. Đang dùng mã hình của cửa hàng." },
    { key: "badge", title: "Nhãn (không bắt buộc)", kind: "text", max: 200, tip: "Ví dụ: MỚI, HOT" },
    { key: "stock", title: "Tồn kho (để trống là không giới hạn)", kind: "number" },
    { key: "sortOrder", title: "Thứ tự hiển thị", kind: "number" },
    { key: "isActive", title: "Đang mở bán", kind: "checkbox" },
    { key: "isFeatured", title: "Vật phẩm nổi bật", kind: "checkbox" },
    { key: "isConsumable", title: "Dùng được nhiều lần", kind: "checkbox" },
    { key: "effectKind", title: "Loại hiệu ứng (tùy chọn)", kind: "select",
      options: [["", "Không đổi hiệu ứng hiện có"], ["avatarFrame", "Khung ảnh đại diện"], ["nameColor", "Màu tên"], ["title", "Danh hiệu"], ["submitEffect", "Hiệu ứng nộp bài"]],
      tip: "Chỉ dùng cho vật phẩm có hiệu ứng trang trí; giữ nguyên dữ liệu cấu hình khác." },
  ],
  users: [
    { key: "name", title: "Tên hiển thị", kind: "text", max: 120 },
    { key: "email", title: "Email đăng nhập", kind: "email", max: 254, required: true },
    { key: "role", title: "Vai trò", kind: "select", options: roles },
    { key: "password", title: "Mật khẩu ban đầu (chỉ khi tạo mới)", kind: "password", required: true, tip: "Ít nhất 8 ký tự. Không thể xem hoặc thay đổi mật khẩu hiện tại ở đây." },
  ],
};

const defaults: Record<Resource, FormValues> = {
  subjects: { name: "", slug: "", family: "THPTQG", description: "", color: "#1f6f5b", icon: "book-open" },
  "store-items": { name: "", slug: "", description: "", category: "EQUIPMENT", price: "200", currency: "EXP",
    imageKey: "orange", badge: "", stock: "", sortOrder: "10", isActive: true, isFeatured: false, isConsumable: false, effectKind: "" },
  users: { name: "", email: "", role: "STUDENT", password: "" },
};

const inputStyle = "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const labelStyle = "grid gap-1.5 text-sm font-bold text-slate-700";
const titles: Record<Resource, [string, string]> = {
  subjects: ["Môn học", "môn học"],
  "store-items": ["Vật phẩm cửa hàng", "vật phẩm"],
  users: ["Tài khoản", "tài khoản"],
};
const slugify = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150);
function isObject(data: unknown): data is Record<string, unknown> {
  return data !== null && typeof data === "object" && !Array.isArray(data);
}
async function responseError(response: Response) {
  const data = await response.json().catch(() => ({}));
  return typeof data.error === "string" ? data.error : "Không xử lý được dữ liệu. Vui lòng thử lại.";
}

export function AdminCatalogManager({ resource }: { resource: Resource }) {
  const [items, setItems] = useState<Item[]>([]);
  const [values, setValues] = useState<FormValues>({ ...defaults[resource] });
  const [editing, setEditing] = useState<Item | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pageSize = 30;

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ managed: "1", page: String(page), pageSize: String(pageSize) });
      if (query) params.set("q", query);
      const response = await fetch("/api/admin/" + resource + "?" + params, { cache: "no-store" });
      if (!response.ok) throw new Error(await responseError(response));
      const result = await response.json();
      setItems(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tải được danh sách.");
    }
  }, [resource, page, query]);

  useEffect(() => { void load(); }, [load]);

  function setField(key: string, value: string | boolean) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setValues({ ...defaults[resource] });
    setEditing(null);
  }

  function edit(item: Item) {
    const next: FormValues = { ...defaults[resource] };
    for (const field of fields[resource]) {
      if (field.key === "password") continue;
      if (field.key === "effectKind") {
        next.effectKind = isObject(item.metadata) && typeof item.metadata.kind === "string"
          ? item.metadata.kind : "";
      } else {
        const value = item[field.key];
        next[field.key] = typeof value === "boolean" ? value : value === null || value === undefined ? "" : String(value);
      }
    }
    setValues(next); setEditing(item);
    setMessage("Đang chỉnh sửa: " + (item.name ?? item.email ?? item.id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildPayload() {
    const payload: Record<string, unknown> = {};
    for (const field of fields[resource]) {
      if (field.key === "password" && editing) continue;
      if (field.key === "effectKind") continue;
      const value = values[field.key];
      if (field.kind === "checkbox") payload[field.key] = value === true;
      else if (field.kind === "number") {
        if (field.key === "stock" && String(value ?? "").trim() === "") {
          payload[field.key] = null;
        } else {
          const number = Number(value);
          if (!Number.isSafeInteger(number) || (field.key !== "sortOrder" && number < 0)) {
            throw new Error(field.title + " phải là số nguyên hợp lệ.");
          }
          payload[field.key] = number;
        }
      } else if (field.key === "badge") payload.badge = String(value ?? "").trim() || null;
      else if (field.key === "name" && resource === "users") payload.name = String(value ?? "").trim() || null;
      else if (field.key === "email") payload.email = String(value ?? "").trim().toLowerCase();
      else payload[field.key] = String(value ?? "").trim();
    }
    if (resource === "store-items") {
      const kind = String(values.effectKind ?? "");
      if (kind) {
        const previous = editing && isObject(editing.metadata) ? editing.metadata : {};
        payload.metadata = { ...previous, kind };
      }
    }
    return payload;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let payload: Record<string, unknown>;
    try {
      payload = buildPayload();
      if (!String(payload.name ?? "").trim() && resource !== "users") throw new Error("Hãy nhập tên.");
      if (resource === "subjects" && !/^#[0-9a-fA-F]{6}$/.test(String(payload.color))) {
        throw new Error("Màu hiển thị phải là mã HEX, ví dụ #f97316.");
      }
      if (resource === "users" && !editing) {
        if (String(payload.password ?? "").length < 8) throw new Error("Mật khẩu ban đầu cần ít nhất 8 ký tự.");
        if (payload.role === "ADMIN" && !window.confirm("Bạn muốn tạo tài khoản có toàn quyền quản trị website?")) return;
      }
      if (resource === "users" && editing && payload.role !== editing.role &&
          !window.confirm("Đổi vai trò tài khoản " + editing.email + " từ " + editing.role + " sang " + payload.role + "?")) return;
      if (editing && resource === "subjects" && payload.slug !== editing.slug &&
          !window.confirm("Bạn đã sửa slug môn học. Link môn học cũ có thể không còn hoạt động. Tiếp tục?")) return;
      if (editing && resource === "store-items" && payload.slug !== editing.slug &&
          !window.confirm("Bạn đã sửa slug vật phẩm. Tiếp tục?")) return;
    } catch (error) { return setMessage(error instanceof Error ? error.message : "Thông tin không hợp lệ."); }

    setBusy(true); setMessage("Đang lưu...");
    try {
      const url = "/api/admin/" + resource + (editing ? "/" + encodeURIComponent(editing.id) : "");
      const response = await fetch(url, {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setMessage(editing ? "Đã cập nhật thành công." : "Đã tạo thành công.");
      reset();
      if (page !== 1) setPage(1);
      else await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu.");
    } finally { setBusy(false); }
  }

  async function remove(item: Item) {
    if (resource === "users") return;
    if (resource === "subjects") {
      const count = (item._count?.exams ?? 0) + (item._count?.topics ?? 0) +
        (item._count?.theoryChapters ?? 0) + (item._count?.theoryArticles ?? 0);
      if (count > 0) return setMessage("Môn học đã có đề thi hoặc dữ liệu học tập. Không thể xóa; hãy sửa thông tin môn học.");
    }
    if (resource === "store-items" && (item._count?.purchases ?? 0) > 0) {
      return setMessage("Vật phẩm đã có người mua. Hãy chọn Sửa và bỏ chọn Đang mở bán để bảo toàn lịch sử mua.");
    }
    if (!window.confirm("Xóa vĩnh viễn " + String(item.name ?? item.id) + "? Thao tác không thể hoàn tác.")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/" + resource + "/" + encodeURIComponent(item.id), { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      if (editing?.id === item.id) reset();
      setMessage("Đã xóa " + String(item.name) + ".");
      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không xóa được.");
    } finally { setBusy(false); }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(320px,.9fr)_minmax(360px,1.1fr)]">
      <section className="h-fit rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-950">{editing ? "Sửa " + titles[resource][1] : "Thêm " + titles[resource][1]}</h2>
          {editing ? <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-sm font-bold text-orange-600"><X className="h-4 w-4" /> Hủy sửa</button> : null}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">Điền thông tin và nhấn lưu, không cần dùng JSON hoặc sao chép ID.</p>
        <form onSubmit={(event) => void save(event)} className="mt-5 grid gap-4">
          {fields[resource].filter((field) => field.key !== "password" || !editing).map((field) => (
            <label key={field.key} className={field.kind === "checkbox" ? "flex items-center gap-2 text-sm font-bold text-slate-700" : labelStyle}>
              {field.kind === "checkbox" ? (
                <><input type="checkbox" checked={values[field.key] === true} onChange={(event) => setField(field.key, event.target.checked)} /> {field.title}</>
              ) : (
                <>
                  {field.title}
                  {field.kind === "textarea" ? (
                    <textarea className={inputStyle} rows={3} maxLength={field.max} value={String(values[field.key] ?? "")}
                      onChange={(event) => setField(field.key, event.target.value)} />
                  ) : field.kind === "select" ? (
                    <select className={inputStyle} value={String(values[field.key] ?? "")} onChange={(event) => setField(field.key, event.target.value)}>
                      {field.options?.map(([key, name]) => <option key={key || "none"} value={key}>{name}</option>)}
                    </select>
                  ) : (
                    <input className={inputStyle} type={field.kind === "number" ? "number" : field.kind}
                      min={field.kind === "number" && field.key !== "sortOrder" ? 0 : undefined}
                      maxLength={field.max} required={field.required}
                      autoComplete={field.kind === "password" ? "new-password" : undefined}
                      value={String(values[field.key] ?? "")} onChange={(event) => setField(field.key, event.target.value)} />
                  )}
                  {field.tip ? <span className="text-xs font-normal leading-5 text-slate-500">{field.tip}</span> : null}
                </>
              )}
            </label>
          ))}
          {resource === "users" && editing ? (
            <p className="rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-800">Chỉnh tên, email hoặc vai trò không làm mất dữ liệu học tập. Mật khẩu và số dư EXP/Coin không được thay đổi ở đây.</p>
          ) : null}
          <button type="submit" disabled={busy} className="min-h-12 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50">
            {busy ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo mới"}
          </button>
        </form>
        {message ? <p role="status" className="mt-4 rounded-xl bg-orange-50 p-3 text-sm font-bold leading-6 text-orange-900">{message}</p> : null}
      </section>
      <section className="min-w-0 rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-950">{titles[resource][0]} ({total})</h2>
          <button type="button" aria-label="Tải lại danh sách" onClick={() => void load()} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><RefreshCw className="h-5 w-5" /></button>
        </div>
        <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search.trim()); }}>
          <input className={inputStyle} aria-label={"Tìm " + titles[resource][1]} value={search}
            onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, email hoặc mã..." />
          <button type="submit" aria-label="Tìm kiếm" className="rounded-xl bg-slate-950 px-4 text-white"><Search className="h-4 w-4" /></button>
        </form>
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="break-words font-black text-slate-950">{item.name || item.email || "Chưa đặt tên"}</h3>
                  {resource === "users" ? (
                    <p className="mt-1 break-all text-sm text-slate-600">{item.email} · {roles.find(([key]) => key === item.role)?.[1] ?? item.role}</p>
                  ) : resource === "subjects" ? (
                    <p className="mt-1 text-sm text-slate-600">{item.slug} · {item.family === "DGNL" ? "ĐGNL" : "THPT"} · {item._count?.exams ?? 0} đề thi</p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-600">{categories.find(([key]) => key === item.category)?.[1]} · {item.price?.toLocaleString("vi-VN")} {item.currency} · {item.isActive ? "Đang bán" : "Đã ẩn"} · {item._count?.purchases ?? 0} lượt mua</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => edit(item)}
                    className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-700 shadow-sm disabled:opacity-50">
                    <Pencil className="h-4 w-4" /> Sửa
                  </button>
                  {resource !== "users" ? (
                    <button type="button" disabled={busy} onClick={() => void remove(item)}
                      className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 disabled:opacity-50">
                      <Trash2 className="h-4 w-4" /> Xóa
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
          {!items.length ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Không tìm thấy dữ liệu phù hợp.</p> : null}
        </div>
        <div className="mt-5 flex items-center justify-between gap-2 text-sm font-bold text-slate-700">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl border px-3 py-2 disabled:opacity-40">Trang trước</button>
          <span>Trang {page}/{pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-xl border px-3 py-2 disabled:opacity-40">Trang sau</button>
        </div>
      </section>
    </div>
  );
}
