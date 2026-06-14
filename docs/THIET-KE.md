# Thiết kế phần mềm — Project Fund Manager (FundFlow)

> Tài liệu tổng quan kiến trúc. Bạn có thể sửa trực tiếp file này để định hướng phát triển.
> Cập nhật: 2026-06.

---

## 1. Mục tiêu nghiệp vụ

Phần mềm quản lý tài chính dự án cho **người sales** điều phối dòng tiền nhiều chiều:

- **Sổ 1 — Quản lý hợp đồng (P/L công ty):** giá trị hợp đồng, P11 (lợi nhuận sau chi phí nội bộ), chi phí NCC/NTP, chi phí khách hàng (CPKH).
- **Sổ 2 — Quỹ vận hành (tiền cá nhân của sales):** tiền NCC/CPKH chảy **về Quỹ**, rồi chi ra cho môi giới / thầu phụ / chuyên gia / ban bệ KH / phát sinh.

Mục tiêu: quản lý **mọi chiều dòng tiền** và **tổng hợp xuyên suốt mọi dự án**.

---

## 2. Mô hình tài chính (cốt lõi)

### 2.1 Hai kênh chi phí
| Kênh | Ý nghĩa | Bảng dữ liệu |
|------|---------|--------------|
| **NCC / NTP** | Chi phí qua nhà cung cấp / thầu phụ | `ncc_items` + `ntp_expenses` |
| **CPKH** | Chi phí khách hàng | `customer_costs` |

### 2.2 Mô hình 3 cửa (per dự án)
```
NGUỒN (về Quỹ)  →  QUỸ (đang giữ)  →  SỬ DỤNG (chi ra)
   ve_quy            dangGiu            other_commitments
```

### 2.3 Công thức (đang dùng trong code)

**Sổ 1 — Flex (quản lý hợp đồng):**
- `Flex NCC   = Σ ncc.contract_amount − Σ ntp.amount`
- `Flex CPKH  = kh_budget − Σ customer_costs.amount`
- `Flex Project = Flex NCC + Flex CPKH`

**Sổ 2 — Quỹ (3 con số vàng + Flex ròng):**
- `Đang giữ  = (Σ ncc.ve_quy + Σ cpkh.ve_quy) − Σ commitments.paid_amount`
- `Phải thu  = (Σ ncc.contract − Σ ncc.ve_quy) + (Flex CPKH − Σ cpkh.ve_quy)`
- `Phải chi  = Σ commitments.amount − Σ commitments.paid_amount`
- `Flex ròng = (Phải thu + Đang giữ) − Phải chi`

> Các số phụ trong tab: `in Quỹ = ve_quy − đã chi`, `Phải thu = ... − ve_quy`.

---

## 3. Tech stack

| Lớp | Công nghệ |
|-----|-----------|
| Framework | **Next.js 14 (App Router)** — Server + Client Components |
| Ngôn ngữ | TypeScript |
| Backend / DB | **Supabase** (Postgres + Auth + RLS) qua `@supabase/ssr` |
| UI | Tailwind CSS + shadcn/ui (giao diện tiếng Việt) |
| Biểu đồ | Recharts (`DashboardChart`) |
| Toast | sonner |
| Deploy | **Vercel** — alias `project-fund-manager.vercel.app`, repo GitHub `titabi/Management-Fee` |

---

## 4. Cấu trúc thư mục

```
app/
  (auth)/                 # Đăng nhập / đăng ký (glassmorphism)
    login/ register/ layout.tsx
  (dashboard)/
    layout.tsx            # Sidebar + khung dashboard
    page.tsx             # TỔNG QUAN: hero, 3 con số vàng, "ai nợ mình/mình nợ ai", chart
    projects/
      page.tsx           # DANH SÁCH dự án + hàng Tổng cộng
      [id]/page.tsx      # CHI TIẾT dự án: khối tổng quan + 4 tab
    settings/            # Cấu hình (mã mời, ...)
  api/check-invite/      # Route kiểm tra mã mời khi đăng ký
  layout.tsx             # Root layout

components/
  layout/Sidebar.tsx
  dashboard/DashboardChart.tsx
  projects/CreateProjectDialog.tsx
  project-detail/
    ChiPhiKhachHang.tsx  # Tab CPKH  (CRUD + về Quỹ per-line)
    HopDongNTP.tsx       # Tab NCC/NTP (accordion NCC > chi tiêu NTP)
    PLFinal.tsx          # Tab P/L Final (contract_value, P11, budget...)
    CamKetKhac.tsx       # Tab "Sổ chi Quỹ" (người nhận, cam kết, đã chi)
    TongQuan.tsx         # (cũ — không còn dùng trong tab)
  ui/                    # shadcn primitives + amount-input (VND ↔ %)

lib/
  supabase/client.ts     # browser client
  supabase/server.ts     # server client (cookies)
  utils/format.ts        # formatVND, formatDate
types/index.ts           # Toàn bộ interface dữ liệu
middleware.ts            # Bảo vệ route, refresh session
supabase/migrations/     # 001 → 006 (chạy THỦ CÔNG trên Supabase)
```

---

## 5. Mô hình dữ liệu (schema hiện tại)

### `profiles`
`id · email · full_name · role('admin'|'member') · created_at`

### `projects`
`id · name · code · client_name · status('active'|'completed'|'paused') · created_at · created_by`

### `pl_summary` (1–1 với project)
`id · project_id · contract_value · p11_profit · kh_budget · ncc_budget · kh_ve_quy · ncc_ve_quy · excel_file_name · note · updated_at`

### `ncc_items` (kênh NCC)
`id · project_id · name · contract_amount · received_amount · ve_quy* · status('pending'|'active'|'completed') · note · created_at`

### `ntp_expenses` (chi tiêu thuộc 1 NCC)
`id · project_id · ncc_item_id · category · description · amount · planned_amount · actual_amount · date · status('planned'|'completed') · note · created_at`

### `customer_costs` (kênh CPKH)
`id · project_id · description · amount · category · date · status('planned'|'completed') · customer_name · ve_quy* · note · created_at`

### `other_commitments` (Sổ chi Quỹ)
`id · project_id · type · recipient* · description · amount(cam kết) · paid_amount(đã chi) · due_date · status('pending'|'paid') · note · created_at`

### `settings`
`key · value · updated_at`  (vd `invite_code`)

> `*` = cột thêm ở **migration 006** (cần chạy thủ công).

---

## 6. Phân quyền & bảo mật
- **Supabase Auth** (email/password). Đăng ký cần **mã mời** (`settings.invite_code`).
- **RLS** bật trên các bảng; hàm `get_user_role()` phân biệt `admin` / `member`.
- `middleware.ts` refresh session và chặn truy cập khi chưa đăng nhập.
- Một số tab (vd Chi phí KH) chỉ admin xem được (`isAdmin`).

---

## 7. Các màn hình chính

| Màn hình | File | Nội dung |
|----------|------|----------|
| Tổng quan | `(dashboard)/page.tsx` | Hero Flex Project + 3 con số vàng; 2 bảng "ai nợ mình / mình nợ ai"; chart; dự án gần đây |
| Danh sách dự án | `projects/page.tsx` | Bảng: Mã·Tên·KH·Flex Project·CPKH·CPKH in Quỹ·Tổng GT NCC·NCC in Quỹ·Tổng phải thu·Trạng thái + hàng **Tổng cộng** |
| Chi tiết dự án | `projects/[id]/page.tsx` | 1 khối tổng quan (Flex Project + 4 con số vàng) + 4 tab |

**4 tab chi tiết:** Chi phí KH · NCC/NTP · P/L Final · Sổ chi Quỹ (mỗi tab có 1 dải số gọn ở đầu).

---

## 8. Quy ước UI
- Mọi ô tiền dùng **`AmountInput`** (nhập VND hoặc % giá hợp đồng, 2 chiều).
- Định dạng tiền qua `formatVND`.
- Màu: xanh dương = Flex/quản lý, xanh lá = in Quỹ/dương, đỏ = âm/phải chi, hổ phách = phải thu, tím = CPKH, cam = NCC.

---

## 9. Vận hành / triển khai
1. Code → `git push origin main`.
2. Deploy: `npx vercel --prod` (alias tự cập nhật).
3. **Migration chạy THỦ CÔNG** trong Supabase → SQL Editor (không tự động).
   - Đang chờ: **006** (`ve_quy` cho ncc_items & customer_costs, `recipient` cho other_commitments).

---

## 10. Hướng phát triển gợi ý (TODO)
- [ ] Trạng thái vòng đời cho "về Quỹ": *Dự kiến về → Đã về Quỹ* (thay vì 1 số).
- [ ] Bộ lọc & tìm kiếm ở danh sách dự án (theo trạng thái, khách hàng).
- [ ] Xuất Excel/PDF báo cáo tổng hợp Quỹ.
- [ ] Lịch sử thay đổi (audit log) cho các khoản tiền.
- [ ] Gộp 2 cột `planned_amount/actual_amount` (legacy) — hiện chỉ dùng `amount`.
