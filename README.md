# Locket Desktop
Ứng dụng Locket không chính thức cho **Windows** — được xây dựng bằng **Tauri 2.x** (Rust) + **React + TypeScript + SCSS**.
<img width="293" height="525" alt="image" src="https://github.com/user-attachments/assets/3fa04797-2d13-4190-8b9a-3bb0ae8c6b3c" />

Hiển thị khoảnh khắc (moments) của bạn bè, nhắn tin, chụp ảnh/quay video và đăng lên Locket ngay trên máy tính.

## Tuyên bố miễn trừ

> [!WARNING]
> Dự án này **không** liên kết với Locket hoặc Locket Labs, Inc. Khi sử dụng phần mềm này, bạn chấp nhận rủi ro tài khoản có thể bị khóa.
>
> Nếu bạn không chắc chắn hoặc không hiểu rõ, xin đừng sử dụng.
>
> Tác giả không chịu trách nhiệm cho bất kỳ hậu quả nào.

---

## Tính năng

### 🖼️ Xem khoảnh khắc (Moments)

- Hiển thị các khoảnh khắc mới nhất từ bạn bè (ảnh/video + caption).
- Cuộn chuột hoặc dùng phím mũi tên ↑↓ để chuyển giữa các khoảnh khắc.
- Nút "new moment" xuất hiện khi có khoảnh khắc mới trong lúc đang xem.
- Lọc khoảnh khắc theo từng bạn bè hoặc xem "Mọi người".
- Xem khoảnh khắc của chính mình.
<img width="291" height="520" alt="image" src="https://github.com/user-attachments/assets/697c9d0a-d487-49d8-abe6-821a8819cf95" />




### 📸 Chụp ảnh & Quay video

- Camera trực tiếp tích hợp ngay trong giao diện chính.
- **Bấm nhanh**: chụp ảnh.
- **Giữ lâu** (>0.5s): bắt đầu quay video (tối đa 10 giây).
- Hỗ trợ upload ảnh/video từ file (kéo-thả hoặc chọn từ máy).
- Crop ảnh không vuông bằng cách kéo-thả trước khi đăng.
- Thêm caption trước khi đăng.
- Ảnh tự động chuyển đổi sang **WebP 1024×1024** trước khi upload.
<img width="290" height="524" alt="image" src="https://github.com/user-attachments/assets/f9cdd646-a819-4735-8a6b-1e319ca71211" />


### 💬 Nhắn tin (Chat)

- Danh sách cuộc trò chuyện với bạn bè.
- Nhắn tin real-time qua **WebSocket** + polling backup (5 giây/lần).
- Hiển thị lịch sử tin nhắn bao gồm ảnh/video moment đính kèm.
- Đánh dấu đã đọc / đã gửi tự động.
- Badge số tin nhắn chưa đọc.
<img width="294" height="524" alt="image" src="https://github.com/user-attachments/assets/244504e9-6653-4ad9-92d6-35bc4da7f0cc" />


### 🔔 Thông báo

- Thông báo hệ thống dạng popup tùy chỉnh khi có khoảnh khắc mới hoặc tin nhắn mới.
- Bấm vào thông báo → mở ứng dụng và điều hướng đến nội dung tương ứng.
- Có thể bật/tắt thông báo trong menu.
<img width="191" height="131" alt="image" src="https://github.com/user-attachments/assets/d1a75171-0146-4c18-9b62-aad7c86403e5" />

<img width="247" height="60" alt="image" src="https://github.com/user-attachments/assets/cb9f3bcf-8a33-4e4a-9058-19f31acf3445" />

<img width="242" height="63" alt="image" src="https://github.com/user-attachments/assets/f9d2e373-1dbb-4d54-9a3e-074fd51b193d" />


### 😍 Reactions & Tin nhắn nhanh

- Thả reaction emoji lên khoảnh khắc của bạn bè.
- Gửi tin nhắn nhanh ngay dưới khoảnh khắc đang xem.
- Hiệu ứng emoji rơi (falling animation) khi thả reaction.

### 🗑️ Quản lý khoảnh khắc

- Xóa khoảnh khắc do mình đăng (xóa toàn cục trên Locket).
- Tải khoảnh khắc về máy (ảnh WebP / video MP4).
- Xóa sạch gallery cục bộ.

### ⚙️ System Tray

- Ẩn vào khay hệ thống khi đóng cửa sổ (không thoát hoàn toàn).
- Menu tray:
  - **Show** / **Hide** — hiện/ẩn cửa sổ
  - **Always on top** — bật/tắt luôn hiển thị trên cùng
  - **Start with Windows** — khởi động cùng Windows (lưu vào Registry)
  - **Open data folder** — mở thư mục dữ liệu `%APPDATA%\com.locket.widget\`
  - **Quit** — thoát hoàn toàn
- Bấm trái vào icon tray để toggle ẩn/hiện cửa sổ.
<img width="147" height="107" alt="image" src="https://github.com/user-attachments/assets/029f9f73-dfe7-4b7a-8331-75b9ae19d7e1" />


### 🔐 Đăng nhập

- Đăng nhập bằng **số điện thoại** (OTP qua Locket API).
- Đăng nhập bằng **email/mật khẩu** (Firebase Auth).
- Selector mã quốc gia với cờ quốc kỳ.
- Token tự động refresh khi hết hạn.
<img width="292" height="523" alt="image" src="https://github.com/user-attachments/assets/4cec5239-3985-4a61-b7ee-2e493bdd3d79" />

---

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Desktop framework | [Tauri 2.x](https://v2.tauri.app/) (Rust) |
| Frontend | React 18 + TypeScript |
| Bundler | Vite 6 |
| Styling | SCSS Modules |
| Font | Inter (nội dung), Manrope (tiêu đề) |
| HTTP client | `@tauri-apps/plugin-http` (bypass CORS) |
| Lưu trữ | `@tauri-apps/plugin-store` (JSON cục bộ) |
| Thông báo | Notification window tùy chỉnh (Tauri multi-window) |
| Autostart | `tauri-plugin-autostart` (Windows Registry) |
| Icons | [react-icons](https://react-icons.github.io/react-icons) |

---

## Cấu trúc dự án

```
LocketDesktop/
├── src/                            ← Frontend (React + TypeScript)
│   ├── main.tsx                    ← Điểm vào React
│   ├── Popup.tsx                   ← Component gốc, quản lý state toàn cục
│   ├── MainContext.ts              ← React Context (đăng nhập, moments, bạn bè, chat...)
│   ├── const.ts                    ← Phiên bản ứng dụng
│   ├── index.scss                  ← Style toàn cục (màu sắc, font, nút bấm)
│   ├── screens/
│   │   ├── Main.tsx                ← Màn hình chính: camera, feed, reactions, upload
│   │   ├── Login.tsx               ← Đăng nhập (SĐT/OTP hoặc email)
│   │   ├── Global.tsx              ← Layout tổng, điều hướng giữa các section
│   │   ├── Chat.tsx                ← Nhắn tin (danh sách + giao diện chat)
│   │   ├── Uploader.tsx            ← Upload ảnh lên Locket
│   │   ├── SavedMoments.tsx        ← Gallery khoảnh khắc đã lưu
│   │   ├── About.tsx               ← Màn hình giới thiệu
│   │   ├── Notification.tsx        ← Popup thông báo (cửa sổ riêng)
│   │   └── Loading.tsx             ← Màn hình loading
│   ├── components/
│   │   ├── Avatar.tsx              ← Ảnh đại diện (fallback chữ cái)
│   │   ├── Spinner.tsx             ← Hiệu ứng loading xoay
│   │   ├── PhoneNumber.tsx         ← Input số điện thoại + chọn mã quốc gia
│   │   ├── Logo.tsx                ← Logo ứng dụng
│   │   └── WhatIcon.tsx            ← Icon tùy chỉnh
│   ├── services/
│   │   ├── api.ts                  ← Gọi HTTP đến Firebase & Locket API
│   │   └── event.ts               ← Event emitter nội bộ
│   ├── lib/
│   │   ├── momentService.ts        ← Polling moments (25s), thông báo, đồng bộ
│   │   ├── uploadService.ts        ← Upload ảnh/video lên Firebase Storage + đăng bài
│   │   └── store.ts                ← Wrapper Tauri Store (lưu trữ cục bộ)
│   ├── types/
│   │   ├── auth.ts                 ← Kiểu dữ liệu đăng nhập
│   │   ├── moments.ts              ← Kiểu dữ liệu khoảnh khắc
│   │   └── user.ts                 ← Kiểu dữ liệu người dùng
│   ├── utils/
│   │   └── string.ts              ← Tiện ích chuỗi (thời gian tương đối)
│   └── constants/
│       └── emojis.ts              ← Danh sách emoji cho reactions
├── src-tauri/                      ← Backend (Rust / Tauri)
│   ├── src/
│   │   └── lib.rs                  ← Tray icon, vị trí cửa sổ, autostart, sự kiện đóng
│   ├── tauri.conf.json             ← Cấu hình cửa sổ & ứng dụng
│   ├── Cargo.toml                  ← Dependencies Rust
│   ├── capabilities/
│   │   └── default.json            ← Quyền plugin (HTTP, FS, notification...)
│   └── icons/                      ← Icon ứng dụng (các kích thước)
├── manifest.json                   ← Chrome Extension manifest (phiên bản mở rộng)
├── GUIDE.md                        ← Hướng dẫn phát triển chi tiết
├── package.json                    ← Dependencies & scripts
└── vite.config.ts                  ← Cấu hình Vite
```

---

## Cài đặt

Tải bản cài đặt từ trang [Releases](https://github.com/VthongVthongVthong/LocketDesktop/releases/latest):

```
Locket Desktop_x.x.x_x64-setup.exe   ← NSIS installer (khuyến nghị)
Locket Desktop_x_x.x.x_x64_en-US.msi   ← MSI installer
```

---

## Phát triển

### Yêu cầu

- [Node.js](https://nodejs.org) 18+
- [pnpm](https://pnpm.io) — `npm install -g pnpm`
- [Rust](https://rustup.rs) — toolchain `stable`
- Visual Studio C++ Build Tools (chọn **Desktop development with C++**)

### Chạy ở chế độ phát triển

```bash
git clone https://github.com/VthongVthongVthong/LocketDesktop
cd LocketDesktop
pnpm install
pnpm tauri dev
```

> **Lưu ý:** Lần chạy đầu tiên sẽ biên dịch khoảng ~200 Rust crate, mất 2–5 phút. Các lần sau chỉ mất vài giây.

### Build production

```bash
pnpm tauri build
```

Output nằm ở:

```
src-tauri/target/release/bundle/
├── nsis/Locket Desktop_x.x.x_x64-setup.exe
└── msi/Locket Desktop_x.x.x_x64_en-US.msi
```

### Thay đổi phiên bản

Cập nhật **3 nơi**:

| File | Trường |
|---|---|
| `src/const.ts` | `export const VERSION = 'x.x.x'` |
| `package.json` | `"version": "x.x.x"` |
| `src-tauri/tauri.conf.json` | `"version": "x.x.x"` |

### Thay đổi icon

```bash
pnpm tauri icon đường/dẫn/tới/icon.png
```

Cung cấp file PNG vuông ít nhất **1024×1024px**. Lệnh sẽ tự sinh tất cả kích thước vào `src-tauri/icons/`.

### Hướng dẫn chi tiết

Xem [GUIDE.md](GUIDE.md) để biết thêm về kiến trúc API, cách thêm endpoint, cơ chế polling/notification, cấu hình Tauri window, v.v.

---

## API & Luồng dữ liệu

### Đăng nhập

```
Số điện thoại → OTP (Locket API) → Custom Token → Firebase ID Token
Email/Password → Firebase verifyPassword → ID Token
```

### Polling khoảnh khắc

`momentService.ts` gọi API mỗi **25 giây**. Khi phát hiện khoảnh khắc mới:

1. Lưu vào store cục bộ
2. Gửi thông báo (hiện cửa sổ notification tùy chỉnh)
3. Bấm vào thông báo → focus ứng dụng, điều hướng đến moment

### Upload ảnh/video

```
1. Refresh token
       ↓
2. POST Firebase Storage → lấy Upload URL
       ↓
3. PUT file lên Upload URL
       ↓
4. GET download token từ Firebase Storage
       ↓
5. POST api.locketcamera.com/postMomentV2
```

### Chat (WebSocket + Polling)

```
1. Lấy lịch sử tin nhắn từ Firestore (thử nhiều database path)
       ↓
2. Mở WebSocket tới wss://api.locketcamera.com/wss_v2/chat
       ↓
3. Polling backup mỗi 5 giây để đồng bộ
       ↓
4. Tin nhắn mới → merge + dedup → hiển thị real-time
```

---

## Dữ liệu lưu trữ

Dữ liệu cục bộ được lưu tại: `%APPDATA%\com.locket.widget\locket-widget.json`

| Key | Kiểu | Mô tả |
|---|---|---|
| `token` | `string` | Firebase ID token (hết hạn sau 1h) |
| `refreshToken` | `string` | Firebase refresh token |
| `user` | `UserType` | Thông tin tài khoản |
| `moments` | `SavedMomentType[]` | Danh sách khoảnh khắc |
| `lastMD5` | `string` | MD5 moment mới nhất (tránh trùng lặp) |
| `friends_cache` | `any[]` | Cache danh sách bạn bè |
| `conversations_cache` | `any[]` | Cache danh sách cuộc trò chuyện |
| `notifications_enabled` | `boolean` | Bật/tắt thông báo |

---

## Giấy phép

Toàn bộ mã nguồn được phát hành theo [Giấy phép MIT](LICENSE).

## Ghi công

Dự án tham khảo [michioxd](https://github.com/michioxd/luckit), [Holozok](https://github.com/Holozok/luckit), [doi2523](https://github.com/doi2523/Client-Locket-Dio)

Phát triển [VthongVthongVthong](https://github.com/VthongVthongVthong/LocketDesktop)
