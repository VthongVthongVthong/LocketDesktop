import { useEffect, useState } from "react";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import Avatar from "../components/Avatar";
import cls from "./Notification.module.scss";

export default function NotificationScreen() {
    const [data, setData] = useState<{ title: string, body: string, avatar?: string } | null>(null);

    useEffect(() => {
        const win = getCurrentWindow();
        
        const handleEvent = async (event: any) => {
            setData(event.payload);
            
            // Let Rust handle the heavy lifting of positioning and showing
            await invoke("show_notification");

            // Auto hide after 5 seconds
            setTimeout(() => {
                win.hide();
                setData(null);
            }, 5000);
        };

        // Listen for data targetted at this window
        const unlistenTargeted = win.listen<{ title: string, body: string, avatar?: string }>("show-notification", handleEvent);

        return () => {
            unlistenTargeted.then(f => f());
        };
    }, []);

    if (!data) return null;

    const handleClick = async () => {
        if (data) {
            await emit("notification-clicked", data);
        }
        getCurrentWindow().hide();
    };

    return (
        <div className={cls.NotificationContainer} onClick={handleClick}>
            <div className={cls.Content}>
                <Avatar src={data.avatar} name={data.title} size={44} />
                <div className={cls.Text}>
                    <div className={cls.Title}>{data.title}</div>
                    <div className={cls.Body}>{data.body}</div>
                </div>
            </div>
            <div className={cls.CloseBtn}>✕</div>
        </div>
    );
}
