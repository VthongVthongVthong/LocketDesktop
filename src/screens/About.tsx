import { useState, useEffect } from "react";
import LocketLogo from "../components/Logo";
import { VERSION } from "../const";
import cls from "./About.module.scss";
import { MdOutlineNotifications, MdOutlineFileUpload, MdOutlineFileDownload, MdOutlinePhotoLibrary } from "react-icons/md";
import { TbBrandGithub } from "react-icons/tb";
import { RiPushpinLine } from "react-icons/ri";
import { fetch } from "@tauri-apps/plugin-http";
import { openUrl } from "@tauri-apps/plugin-opener";

const features = [
    { icon: <MdOutlineNotifications />, label: "Thông báo hệ thống khi có khoảnh khắc mới" },
    { icon: <RiPushpinLine />, label: "Tiện ích luôn hiển thị trên cùng (Always-on-top)" },
    { icon: <MdOutlinePhotoLibrary />, label: "Xem và lưu khoảnh khắc về máy" },
    { icon: <MdOutlineFileUpload />, label: "Đăng ảnh lên Locket" },
    { icon: <MdOutlineFileDownload />, label: "Tải khoảnh khắc về thiết bị của bạn" },
];

function isNewer(latest: string, current: string): boolean {
    const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
    const [la, lb, lc] = parse(latest);
    const [ca, cb, cc] = parse(current);
    if (la !== ca) return la > ca;
    if (lb !== cb) return lb > cb;
    return lc > cc;
}

export default function AboutScreen() {
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        fetch("https://api.github.com/repos/Holozok/luckit/releases/latest", {
            method: "GET",
            headers: { Accept: "application/vnd.github+json" },
        })
            .then((r) => r.json() as Promise<{ tag_name?: string }>)
            .then((data) => {
                if (data.tag_name) setLatestVersion(data.tag_name);
            })
            .catch(() => { })
            .finally(() => setChecking(false));
    }, []);

    const hasUpdate = latestVersion !== null && isNewer(latestVersion, VERSION);

    const openUrlInBrowser = async (url: string) => {
        try {
            await openUrl(url);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className={cls.About}>
            <div className={cls.Header}>
                <div className={cls.LogoWrap}>
                    <LocketLogo />
                </div>
                <h1>Locket Desktop</h1>
                <span className={cls.Badge}>v{VERSION} · Windows</span>
                <p className={cls.Tagline}>
                    Ứng dụng Locket không chính thức — tiện ích máy tính cho Windows
                </p>
            </div>

            {checking ? (
                <div className={cls.UpdateStatus}>Đang kiểm tra cập nhật...</div>
            ) : hasUpdate ? (
                <a
                    className={cls.UpdateBanner}
                    href="#"
                    onClick={(e) => { e.preventDefault(); openUrlInBrowser("https://github.com/Holozok/luckit/releases/latest"); }}
                >
                    <span className={cls.UpdateDot} />
                    <span className={cls.UpdateText}>
                        Đã có phiên bản mới: <strong>{latestVersion}</strong>
                    </span>
                    <span className={cls.UpdateLink}>Tải về →</span>
                </a>
            ) : latestVersion !== null ? (
                <div className={cls.UpdateStatus + " " + cls.UpToDate}>✓ Đã là bản mới nhất</div>
            ) : null}

            <div className={cls.Features}>
                {features.map((f, i) => (
                    <div key={i} className={cls.Feature}>
                        <span className={cls.FeatureIcon}>{f.icon}</span>
                        <span>{f.label}</span>
                    </div>
                ))}
            </div>

            <div className={cls.Credits}>
                <h2>Người thực hiện</h2>
                <div className={cls.Authors}>
                    <a className={cls.Author} href="#" onClick={(e) => { e.preventDefault(); openUrlInBrowser("https://github.com/vthongvthongvthong"); }}>
                        <TbBrandGithub />
                        Vthong
                        <span className={cls.AuthorRole}>phiên bản Windows</span>
                    </a>
                </div>
            </div>

            <div className={cls.Credits}>
                <h2>Nguồn tham khảo</h2>
                <div className={cls.Authors}>
                    <a className={cls.Author} href="#" onClick={(e) => { e.preventDefault(); openUrlInBrowser("https://github.com/michioxd"); }}>
                        <TbBrandGithub />
                        michioxd
                        <span className={cls.AuthorRole}>tác giả gốc</span>
                    </a>
                    <a className={cls.Author} href="#" onClick={(e) => { e.preventDefault(); openUrlInBrowser("https://github.com/holozok"); }}>
                        <TbBrandGithub />
                        Holozok
                        <span className={cls.AuthorRole}>phiên bản Windows</span>
                    </a>
                    <a className={cls.Author} href="#" onClick={(e) => { e.preventDefault(); openUrlInBrowser("https://github.com/doi2523"); }}>
                        <TbBrandGithub />
                        doi2523
                        <span className={cls.AuthorRole}>phương thức api locket</span>
                    </a>
                </div>
                <p className={cls.Sub}>
                    Phát hành dưới{" "}
                    <a href="#" onClick={(e) => { e.preventDefault(); openUrlInBrowser("https://github.com/michioxd/luckit/blob/main/LICENSE"); }}>Giấy phép MIT</a>
                    {" "}·{" "}
                    <a href="#" onClick={(e) => { e.preventDefault(); openUrlInBrowser("https://github.com/vthongvthongvthong/LocketDesktop"); }}>Mã nguồn trên GitHub</a>
                </p>
            </div>

            <div className={cls.Disclaimer}>
                <h2>Miễn trừ trách nhiệm</h2>
                <p>
                    Dự án này không liên quan đến Locket hoặc Locket Labs, Inc. Bằng cách sử dụng phần mềm này, bạn xác nhận rằng đây là một ứng dụng không chính thức và chấp nhận rủi ro tài khoản có thể bị khóa. Các tác giả không chịu trách nhiệm cho bất kỳ hậu quả nào.
                </p>
            </div>

            <div className={cls.Footer}>
                &copy; {new Date().getFullYear()} Vthong
            </div>
        </div>
    );
}
