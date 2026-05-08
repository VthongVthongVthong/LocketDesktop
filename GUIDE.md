# Locket Desktop — Hướng dẫn phát triển

Ứng dụng desktop Windows xây dựng bằng **Tauri 2.x** (Rust) + **React 18 + TypeScript + SCSS Modules**.
Client Locket không chính thức — hiển thị khoảnh khắc bạn bè, nhắn tin, chụp ảnh/quay video và đăng lên Locket.

---

## Mục lục

1. [Cài đặt môi trường](#1-cài-đặt-môi-trường)
2. [Chạy ở chế độ phát triển](#2-chạy-ở-chế-độ-phát-triển)
3. [Cấu trúc dự án](#3-cấu-trúc-dự-án)
4. [Tuỳ chỉnh giao diện](#4-tuỳ-chỉnh-giao-diện)
5. [API](#5-api)
6. [Tính năng Tauri (Rust)](#6-tính-năng-tauri-rust)
7. [Build & Đóng gói](#7-build--đóng-gói)

---

## 1. Cài đặt môi trường

**Yêu cầu:**
- [Node.js](https://nodejs.org) 18+
- [pnpm](https://pnpm.io) — `npm install -g pnpm`
- [Rust](https://rustup.rs) — cài qua rustup, toolchain `stable`
- Visual Studio C++ Build Tools (chọn **Desktop development with C++**)

**Cài đặt dependencies:**

```bash
pnpm install
```

---

## 2. Chạy ở chế độ phát triển

```bash
pnpm tauri dev
```

Cửa sổ ứng dụng sẽ mở ở giữa màn hình. Thay đổi trong `src/` sẽ **hot-reload** ngay lập tức — không cần khởi động lại.

> Lần chạy đầu tiên sẽ biên dịch khoảng ~200 Rust crate, mất 2–5 phút. Các lần sau chỉ mất vài giây.

---

## 3. Cấu trúc dự án

```
LocketDesktop/
├── src/                            ← Frontend (React + TypeScript)
│   ├── index.scss                  ← Style toàn cục (màu sắc, font, nút bấm, scrollbar)
│   ├── main.tsx                    ← Điểm vào React
│   ├── Popup.tsx                   ← Component gốc (quản lý state, event, routing)
│   ├── MainContext.ts              ← React Context toàn cục
│   ├── const.ts                    ← VERSION
│   ├── screens/
│   │   ├── Main.tsx                ← Màn hình chính: camera, feed, reactions, upload
│   │   ├── Login.tsx               ← Đăng nhập (SĐT/OTP hoặc email)
│   │   ├── Global.tsx              ← Layout tổng, điều hướng section
│   │   ├── Chat.tsx                ← Nhắn tin (danh sách + giao diện chat)
│   │   ├── Uploader.tsx            ← Upload ảnh lên Locket (flow riêng)
│   │   ├── SavedMoments.tsx        ← Gallery khoảnh khắc đã lưu
│   │   ├── About.tsx               ← Màn hình giới thiệu
│   │   ├── Notification.tsx        ← Cửa sổ popup thông báo (multi-window)
│   │   └── Loading.tsx             ← Màn hình loading
│   ├── components/
│   │   ├── Avatar.tsx              ← Ảnh đại diện (fallback chữ cái đầu)
│   │   ├── Spinner.tsx             ← Hiệu ứng loading xoay
│   │   ├── PhoneNumber.tsx         ← Input SĐT + chọn mã quốc gia (cờ)
│   │   ├── Logo.tsx                ← Logo ứng dụng
│   │   └── WhatIcon.tsx            ← Icon tuỳ chỉnh
│   ├── services/
│   │   ├── api.ts                  ← Gọi HTTP: Firebase Auth + Locket API + Firestore
│   │   └── event.ts               ← Event emitter nội bộ
│   ├── lib/
│   │   ├── momentService.ts        ← Polling (20s), thông báo, đồng bộ, logout
│   │   ├── uploadService.ts        ← Upload ảnh/video lên Firebase Storage + đăng bài
│   │   └── store.ts                ← Wrapper Tauri Store (lưu trữ JSON cục bộ)
│   ├── types/
│   │   ├── auth.ts                 ← Kiểu dữ liệu đăng nhập / refresh
│   │   ├── moments.ts              ← Kiểu dữ liệu khoảnh khắc
│   │   └── user.ts                 ← Kiểu dữ liệu người dùng
│   ├── utils/
│   │   └── string.ts              ← Tiện ích (thời gian tương đối, random string)
│   └── constants/
│       └── emojis.ts              ← Danh sách emoji cho reactions
├── src-tauri/                      ← Backend (Rust / Tauri 2.x)
│   ├── src/
│   │   └── lib.rs                  ← System tray, cửa sổ notification, autostart, sự kiện đóng
│   ├── tauri.conf.json             ← Cấu hình cửa sổ & ứng dụng
│   ├── Cargo.toml                  ← Dependencies Rust
│   ├── capabilities/
│   │   └── default.json            ← Quyền plugin (HTTP, FS, store, notification...)
│   └── icons/                      ← Icon ứng dụng (nhiều kích thước)
├── manifest.json                   ← Chrome Extension manifest (nếu build extension)
├── GUIDE.md                        ← File này
├── package.json                    ← Dependencies & scripts
└── vite.config.ts                  ← Cấu hình Vite
```

---

## 4. Tuỳ chỉnh giao diện

### 4.1 Màu sắc & Font

Chỉnh sửa `src/index.scss`, block `:root`:

```scss
:root {
    --global-timing: cubic-bezier(0.8, 0, 0.2, 1);
    --color: #dadada;    /* màu chữ chính */
    --accent: #F2A900;   /* màu nhấn — nút bấm, highlight */
}
```

**Font đang sử dụng:**
- **Inter** — nội dung (body text)
- **Manrope** — tiêu đề, nút bấm

Cả hai font được import từ `@fontsource/inter` và `@fontsource/manrope`.

### 4.2 Kích thước cửa sổ

Kích thước hiện tại: **390 × 700 px**. Để thay đổi, cập nhật `src-tauri/tauri.conf.json`:

```json
"width": 390,
"height": 700
```

Body sử dụng `100vw` × `100vh` nên tự động khớp với kích thước cửa sổ.

### 4.3 Cấu hình cửa sổ

`src-tauri/tauri.conf.json` có **2 cửa sổ**:

**Cửa sổ chính** (`app.windows[0]`):

```json
{
  "label": "main",
  "title": "Locket Desktop",
  "width": 390,
  "height": 700,
  "resizable": false,
  "decorations": false,
  "transparent": false,
  "alwaysOnTop": false,
  "shadow": false,
  "center": true
}
```

- `decorations: false` — không hiển thị thanh tiêu đề Windows (nút min/max/close do React render)
- `transparent: false` — bắt buộc trên Windows; cửa sổ trong suốt không nhận được sự kiện chuột
- `alwaysOnTop: false` — tắt mặc định; bật/tắt qua menu tray
- `center: true` — cửa sổ mở ở giữa màn hình

**Cửa sổ thông báo** (`app.windows[1]`):

```json
{
  "label": "notification",
  "title": "Luckit Notification",
  "width": 320,
  "height": 80,
  "resizable": false,
  "decorations": false,
  "transparent": true,
  "alwaysOnTop": true,
  "visible": false,
  "skipTaskbar": true,
  "shadow": false,
  "focus": false,
  "url": "index.html?type=notification"
}
```

Cửa sổ này ẩn mặc định, chỉ hiện khi có thông báo mới (moment hoặc tin nhắn). Được đặt tự động ở góc dưới-phải màn hình bởi Rust command `show_notification`.

### 4.4 Thêm mục vào menu

Menu nằm trong `src/screens/Main.tsx` (component `MainScreen`), sử dụng thư viện `@szhsin/react-menu`:

```tsx
<MenuItem onClick={() => { /* handler */ }} className={menuItemClassName}>
    <MdRefresh />
    Tên mục menu
</MenuItem>
```

Duyệt icon tại [react-icons.github.io](https://react-icons.github.io/react-icons).

### 4.5 Điều hướng Section

`Global.tsx` quản lý điều hướng qua `section` state:

| section | Màn hình |
|---|---|
| 0 | `MainScreen` — Camera + Feed |
| 1 | `SavedMoment` — Gallery đã lưu |
| 2 | `AboutScreen` — Giới thiệu |
| 3 | `UploaderScreen` — Upload riêng |
| 4 | `ChatScreen` — Nhắn tin |

Chuyển section: `setSection(n)` từ bất kỳ component nào có `useMainContext()`.

---

## 5. API

### 5.1 Cấu trúc gọi API

Mọi HTTP call nằm trong `src/services/api.ts`. Có 2 hàm helper:

| Hàm | Dùng cho |
|---|---|
| `fetchFirebase(...)` | Google Identity Toolkit, Firebase Auth, Securetoken, Firestore REST |
| `fetchLocket(...)` | `api.locketcamera.com/*` (Locket Cloud Functions) |

Cả hai đều sử dụng `fetch` từ `@tauri-apps/plugin-http` (không phải browser fetch) để bypass CORS của WebView2.

> **Lưu ý:** Nếu thêm call đến domain mới, phải cập nhật scope HTTP trong `src-tauri/capabilities/default.json`.

### 5.2 Thêm API call mới

Thêm vào object `API` trong `src/services/api.ts`:

```ts
export const API = {
    // ... các function hiện có ...

    myNewCall: (data: string, token?: string) => fetchLocket<MyResponseType>({
        endpoint: "myEndpoint",
        method: "POST",
        body: { data: { param: data } },
        token,
    }),
}
```

### 5.3 Các API endpoint hiện có

| Endpoint | Mô tả |
|---|---|
| `login` | Đăng nhập email/password (Firebase verifyPassword) |
| `requestOTP` | Gửi OTP qua số điện thoại |
| `verifyOTP` | Xác minh OTP |
| `exchangeOTPTokenForIDToken` | Đổi custom token → ID token |
| `refreshToken` | Refresh Firebase token |
| `getAccountInfo` | Lấy thông tin tài khoản |
| `fetchLatestMoment` | Lấy khoảnh khắc mới nhất (RPC) |
| `fetchUser` | Lấy thông tin user theo UID |
| `fetchFriends` | Danh sách bạn bè (Firestore REST) |
| `fetchFollowers` | Danh sách followers (Firestore REST) |
| `fetchConversations` | Danh sách cuộc trò chuyện |
| `fetchMessages` | Lấy tin nhắn từ Firestore |
| `createPost` | Đăng ảnh (postMomentV2) |
| `createVideoPost` | Đăng video (postMomentV2) |
| `reactToMoment` | Thả reaction emoji |
| `sendChatMessage` | Gửi tin nhắn (sendChatMessageV2) |
| `markAsRead` / `markAsDelivered` | Đánh dấu đã đọc/gửi |
| `deleteMoment` | Xóa moment (deleteMomentV2) |
| `fetchFriendMomentsV2` | Lấy lịch sử moment của 1 bạn (Firestore runQuery) |

### 5.4 Đọc & Ghi dữ liệu cục bộ

Sử dụng `src/lib/store.ts`:

```ts
import { storeGet, storeSet, storeDelete } from '../lib/store'

const token = await storeGet<string>('token')
await storeSet('token', 'abc123')
await storeDelete('token')
```

**Các key đang sử dụng:**

| Key | Kiểu | Mô tả |
|---|---|---|
| `token` | `string` | Firebase ID token (hết hạn sau 1h) |
| `refreshToken` | `string` | Firebase refresh token |
| `user` | `UserType` | Thông tin tài khoản |
| `moments` | `SavedMomentType[]` | Danh sách khoảnh khắc |
| `lastMD5` | `string` | MD5 moment mới nhất (tránh trùng) |
| `friends_cache` | `any[]` | Cache danh sách bạn bè |
| `conversations_cache` | `any[]` | Cache cuộc trò chuyện |
| `notifications_enabled` | `boolean` | Bật/tắt thông báo |

Vị trí file dữ liệu: `%APPDATA%\com.locket.widget\locket-widget.json`

### 5.5 Polling & Thông báo

`src/lib/momentService.ts` polling mỗi **20 giây**. Mỗi vòng polling:
1. Gọi `fetchLatestMoment()` — lấy moments mới
2. Gọi `pollConversations()` — kiểm tra tin nhắn mới

Khi phát hiện **moment mới**:
1. Lưu vào store
2. Mở cửa sổ notification popup (multi-window Tauri)
3. Emit event `show-notification` đến cửa sổ notification
4. Bấm vào thông báo → emit `notification-clicked` → `Popup.tsx` focus cửa sổ + điều hướng

Khi phát hiện **tin nhắn mới** (unread count tăng):
1. Fetch thông tin user gửi
2. Hiển thị notification popup tương tự

```ts
import { startMomentPolling, stopMomentPolling, onNewMoment } from '../lib/momentService'

startMomentPolling()   // gọi khi đăng nhập
stopMomentPolling()    // gọi khi đăng xuất

// Lắng nghe moments mới từ bất kỳ component nào
const unsub = onNewMoment((moments) => { ... })
return unsub  // cleanup khi unmount
```

Để thay đổi khoảng thời gian polling:
```ts
loopTimer = setTimeout(loop, 20_000)  // ← thay đổi giá trị này (ms)
```

### 5.6 Luồng upload ảnh/video

Logic nằm trong `src/lib/uploadService.ts`:

**Upload ảnh:**
```
1. Refresh token nếu cần
       ↓
2. POST Firebase Storage (bucket: locket-img) → lấy Upload URL
       ↓
3. PUT file (WebP) lên Upload URL
       ↓
4. GET download token từ Firebase Storage metadata
       ↓
5. POST api.locketcamera.com/postMomentV2 (với thumbnail_url)
```

**Upload video:**
```
1. Refresh token nếu cần
       ↓
2. Upload song song: thumbnail (locket-img) + video (locket-video)
       ↓
3. POST api.locketcamera.com/postMomentV2 (với video_url + thumbnail_url)
```

- Ảnh chụp từ camera: tự động chuyển sang **WebP 1024×1024** (via canvas)
- Video: giữ nguyên format (MP4 hoặc WebM), thumbnail tự tạo từ frame 0.5s
- Ảnh import: có thể crop (kéo-thả pan) trước khi upload

### 5.7 Chat (WebSocket + Polling)

Logic nằm trong `src/screens/Chat.tsx`:

```
1. Fetch lịch sử tin nhắn từ Firestore (thử nhiều database + path)
       ↓
2. Mở WebSocket: wss://api.locketcamera.com/wss_v2/chat?otherUserId=...&userId=...&token=...
       ↓
3. Polling backup mỗi 5 giây → re-fetch lịch sử Firestore
       ↓
4. Tin nhắn mới (từ WebSocket hoặc polling) → merge + dedup → render
```

- WebSocket nhận tin nhắn real-time
- Polling backup đảm bảo không mất tin nhắn nếu WebSocket disconnect
- Tự động `markAsRead` / `markAsDelivered` khi nhận tin

---

## 6. Tính năng Tauri (Rust)

Mọi thứ nằm trong `src-tauri/src/lib.rs`.

### 6.1 Cửa sổ chính

Cửa sổ được đặt ở **giữa màn hình** khi khởi động (qua `"center": true` trong `tauri.conf.json`).

Nút min/close do React render trong `Popup.tsx`:
```tsx
<button onClick={() => getCurrentWindow().minimize()}>—</button>
<button onClick={() => getCurrentWindow().close()}>✕</button>
```

Thanh tiêu đề hỗ trợ kéo (drag) thông qua `data-tauri-drag-region`.

### 6.2 Cửa sổ thông báo (Notification)

Rust command `show_notification` tính toán vị trí góc dưới-phải (trên taskbar) và hiển thị cửa sổ notification:

```rust
let x = monitor_width - window_width - 20;
let y = monitor_height - window_height - 60;
window.set_position(PhysicalPosition::new(x, y));
window.show();
```

Cửa sổ notification:
- Trong suốt (`transparent: true`), không viền
- Luôn trên cùng (`alwaysOnTop: true`)
- Không hiện trên taskbar (`skipTaskbar: true`)
- Nhận data qua Tauri event `show-notification`

### 6.3 System Tray

Icon tray cung cấp menu ngữ cảnh:

| Mục | Loại | Hành động |
|---|---|---|
| Show | MenuItem | Hiện cửa sổ + focus |
| Hide | MenuItem | Ẩn cửa sổ |
| Always on top | CheckMenuItem | Bật/tắt `set_always_on_top` |
| Start with Windows | CheckMenuItem | Bật/tắt autostart (Windows Registry) |
| Open data folder | MenuItem | Mở `%APPDATA%\com.locket.widget\` trong Explorer |
| Quit | MenuItem | `app.exit(0)` — thoát hoàn toàn |

Bấm **trái** vào icon tray → toggle ẩn/hiện cửa sổ (không mở menu).

### 6.4 Hành vi nút đóng

Nhấn X hoặc `Alt+F4` **ẩn cửa sổ vào tray** — không thoát ứng dụng. Muốn thoát hoàn toàn: Tray → Quit.

```rust
.on_window_event(|window, event| {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        let _ = window.hide();
        api.prevent_close();
    }
})
```

### 6.5 Autostart

Sử dụng `tauri-plugin-autostart` — ghi vào `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
Bật/tắt qua tray; trạng thái ban đầu đọc từ registry khi khởi động.

### 6.6 Plugins đang sử dụng

| Plugin | Chức năng |
|---|---|
| `tauri-plugin-http` | HTTP client (bypass CORS) |
| `tauri-plugin-store` | Lưu trữ JSON cục bộ |
| `tauri-plugin-dialog` | Hộp thoại lưu file |
| `tauri-plugin-fs` | Ghi file (tải moment) |
| `tauri-plugin-notification` | Thông báo hệ thống (cơ bản) |
| `tauri-plugin-autostart` | Khởi động cùng Windows |
| `tauri-plugin-opener` | Mở link ngoài trình duyệt |

### 6.7 Quyền Plugin

`src-tauri/capabilities/default.json` — thêm quyền ở đây nếu plugin báo lỗi scope:

```json
{
  "identifier": "http:default",
  "allow": [{ "url": "https://**" }]
}
```

Quyền áp dụng cho cả 2 cửa sổ `"main"` và `"notification"`.

---

## 7. Build & Đóng gói

### 7.1 Build Production

```bash
pnpm tauri build
```

Output:
```
src-tauri/target/release/bundle/
├── nsis/Locket Desktop_x.x.x_x64-setup.exe   ← NSIS installer (khuyến nghị)
└── msi/Locket Desktop_x.x.x_x64_en-US.msi
```

### 7.2 Thay đổi phiên bản

Cập nhật **3 nơi**:

| File | Trường |
|---|---|
| `src/const.ts` | `export const VERSION = 'x.x.x'` |
| `package.json` | `"version": "x.x.x"` |
| `src-tauri/tauri.conf.json` | `"version": "x.x.x"` |

### 7.3 Thay đổi icon ứng dụng

```bash
pnpm tauri icon đường/dẫn/tới/icon.png
```

Cung cấp file PNG vuông ít nhất **1024×1024px**. Lệnh sẽ tự sinh tất cả kích thước cần thiết vào `src-tauri/icons/`.

### 7.4 Build Frontend riêng

```bash
pnpm build
```

Output vào `dist/` — hữu ích để kiểm tra bundle size hoặc debug CSS.

---

## Lưu ý quan trọng

- Ứng dụng này **không chính thức** và không liên kết với Locket Labs, Inc.
- Token AppCheck trong `src/services/api.ts` và `src/lib/uploadService.ts` có thể hết hạn — nếu đăng nhập trả về 403, cần cập nhật token.
- Dữ liệu cục bộ lưu tại: `%APPDATA%\com.locket.widget\locket-widget.json`
- `transparent: false` bắt buộc trên Windows cho cửa sổ chính — cửa sổ trong suốt không nhận sự kiện chuột ở vùng trong suốt.
- Cửa sổ notification dùng `transparent: true` vì nó chỉ hiển thị thoáng qua và không cần tương tác phức tạp.
- Upload sử dụng 2 Firebase Storage bucket riêng biệt: `locket-img` (ảnh) và `locket-video` (video).
