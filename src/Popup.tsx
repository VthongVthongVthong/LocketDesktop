import { useEffect, useState, useRef } from "react"
import { listen } from "@tauri-apps/api/event";
import LoginScreen from "./screens/Login"
import LoadingScreen from "./screens/Loading";
import { MainContext } from "./MainContext";
import { UserType } from "./types/user";
import GlobalScreen from "./screens/Global";
import { storeGet } from "./lib/store";
import { onLogout, onNewMoment, startMomentPolling, stopMomentPolling } from "./lib/momentService";
import { SavedMomentType } from "./types/moments";
import { getCurrentWindow } from '@tauri-apps/api/window';

import NotificationScreen from "./screens/Notification";

function Popup() {
    const [isNotification, setIsNotification] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get("type") === "notification";
    });

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("type") === "notification") {
            setIsNotification(true);
        }
    }, []);

    const [loggedIn, setLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<UserType | null>(null);
    const [moments, setMoments] = useState<SavedMomentType[]>([]);

    const [friends, setFriends] = useState<any[]>([]);
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedFriendUid, setSelectedFriendUid] = useState<string | null>(null);
    const [friendMoments, setFriendMoments] = useState<SavedMomentType[]>([]);
    const [section, setSection] = useState(0);
    const [selectedConv, setSelectedConv] = useState<any | null>(null);
    const [targetMomentUid, setTargetMomentUid] = useState<string | null>(null);
    const [inItem, setInItem] = useState(0);

    const conversationsRef = useRef<any[]>([]);
    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    if (isNotification) {
        return <NotificationScreen />;
    }

    useEffect(() => {
        const init = async () => {
            const token = await storeGet<string>('token');
            const user = await storeGet<UserType>('user');
            const saved = (await storeGet<SavedMomentType[]>('moments')) ?? [];
            const cachedFriends = (await storeGet<any[]>('friends_cache')) ?? [];
            const cachedConvs = (await storeGet<any[]>('conversations_cache')) ?? [];

            if (token && user) {
                setUserData(user);
                setMoments(saved);
                setFriends(cachedFriends);
                setConversations(cachedConvs);
                setLoggedIn(true);
                
                // Refresh data silently
                refreshData(token, user.localId);
                startMomentPolling();
                
                // Initial load of history if gallery is empty
                if (saved.length === 0) {
                    import("./lib/momentService").then(m => m.fetchLatestMoment(true));
                }
            }
            setLoading(false);
        };

        init();

        const unsubMoment = onNewMoment((m) => {
            console.log(`[Popup] Global moment subscription triggered with ${m.length} moments`);
            setMoments(m);
        });
        const unsubLogout = onLogout(() => {
            setLoggedIn(false);
            setUserData(null);
            setMoments([]);
            setFriends([]);
            setConversations([]);
            setSelectedFriendUid(null);
            setFriendMoments([]);
            setSection(0);
            setSelectedConv(null);
            stopMomentPolling();
        });

        const unsubClick = listen<{ type: string, uid?: string }>("notification-clicked", async (event) => {
            const { type, uid } = event.payload;
            console.log(`[Popup] Notification clicked: type=${type}, uid=${uid}`);
            
            const win = getCurrentWindow();
            try {
                await win.show();
                await win.unminimize();
                await win.setFocus();
            } catch (e) {
                console.warn("[Popup] Window command failed", e);
            }

            if (type === "message") {
                setSection(4); // Chat screen
                if (uid) {
                    const conv = conversationsRef.current.find(c => c.otherUser?.uid === uid);
                    if (conv) {
                        setSelectedConv(conv);
                    } else {
                        console.log("[Popup] Conversation not found for uid:", uid, conversationsRef.current);
                    }
                }
            } else if (type === "moment") {
                const { momentUid } = event.payload as any;
                console.log("[Popup] Moment notification clicked, target momentUid:", momentUid);
                setSection(0); // Main screen
                setSelectedFriendUid(null); // Show everyone
                if (momentUid) {
                    setTargetMomentUid(momentUid);
                }
            }
        });

        return () => {
            unsubMoment();
            unsubLogout();
            unsubClick.then(f => f());
            stopMomentPolling();
        };
    }, []);

    const refreshData = async (token: string, userId: string) => {
        const { API } = await import("./services/api");
        
        API.setClientData(token).catch(console.error);
        API.setNotificationToken(token).catch(console.error);

        // 1. Load Friends
        try {
            const resp = await API.fetchFriends(userId, token);
            const docs = resp.documents || [];
            const friendList = [];
            for (const doc of docs.slice(0, 20)) {
                const uid = doc.fields?.user?.stringValue;
                if (uid) {
                    try {
                        const user = await API.fetchUser(uid, token);
                        if (user?.data) friendList.push(user.data);
                    } catch (e) { console.error("Fetch friend error", e); }
                }
            }
            setFriends(friendList);
            const { storeSet } = await import("./lib/store");
            await storeSet('friends_cache', friendList);
        } catch (e) { console.error("Load friends error", e); }

        // 2. Load Conversations
        try {
            const dbs = ["locket", "(default)"];
            const allDocs: any[] = [];
            for (const db of dbs) {
                try {
                    const resp = await API.fetchConversations(userId, token, db);
                    (resp.documents || []).forEach((d: any) => allDocs.push({ doc: d, db }));
                } catch (e) {
                    console.warn(`[Popup] Fetch conversations failed for db ${db}:`, e);
                }
            }

            const loadedConvs = await Promise.all(allDocs.map(async ({ doc, db }) => {
                try {
                    const f = doc.fields;
                    const members = f.members?.arrayValue?.values?.map((v: any) => v.stringValue) || [];
                    const otherUid = members.find((id: string) => id !== userId);
                    const convId = doc.name.split('/').pop();
                    const latest = f.latest_message?.mapValue?.fields;
                    
                    const baseConv = {
                        id: convId,
                        sourceDb: db,
                        otherUser: { uid: otherUid, first_name: "Unknown", last_name: "User", profile_picture_url: "" },
                        latestMessage: latest ? {
                            body: latest.body?.stringValue || latest.msg?.stringValue || "Sent a moment",
                            sender: latest.sender?.stringValue || latest.sender_uid?.stringValue || "",
                            createdAt: latest.created_at?.timestampValue || latest.date?.timestampValue
                        } : null,
                        unreadCount: parseInt(f.unread_count?.integerValue || "0", 10),
                        lastUpdated: f.last_updated?.timestampValue
                    };

                    if (otherUid) {
                        try {
                            const userResp = await API.fetchUser(otherUid, token);
                            if (userResp?.data) {
                                baseConv.otherUser = userResp.data;
                            }
                        } catch {
                            console.warn(`[Popup] Fetch user ${otherUid} failed`);
                        }
                    }
                    return baseConv;
                } catch (e) {
                    console.error("[Popup] Normalize conv error", e);
                    return null;
                }
            }));
            const validConvs = loadedConvs.filter(Boolean);
            setConversations(validConvs);
            const { storeSet } = await import("./lib/store");
            await storeSet('conversations_cache', validConvs);
        } catch (e) { console.error("Load convs main error", e); }
    };

    const handleLogin = async (user: UserType) => {
        const saved = (await storeGet<SavedMomentType[]>('moments')) ?? [];
        const cachedFriends = (await storeGet<any[]>('friends_cache')) ?? [];
        const cachedConvs = (await storeGet<any[]>('conversations_cache')) ?? [];
        
        setUserData(user);
        setMoments(saved);
        setFriends(cachedFriends);
        setConversations(cachedConvs);
        setLoggedIn(true);

        const token = await storeGet<string>('token');
        if (token) {
            await refreshData(token, user.localId);
        }
        setSection(0);
        setSelectedConv(null);
        startMomentPolling();
        
        // Initial load of history
        const { fetchLatestMoment } = await import("./lib/momentService");
        fetchLatestMoment(true);
    };

    const loadMoreFriendMoments = async () => {
        if (!selectedFriendUid || friendMoments.length === 0) return;
        const lastMoment = friendMoments[friendMoments.length - 1];
        const { fetchMoreFriendMoments } = await import("./lib/momentService");
        const newMoments = await fetchMoreFriendMoments(selectedFriendUid, lastMoment);
        if (newMoments.length > 0) {
            setFriendMoments(prev => [...prev, ...newMoments]);
        }
    };


    return (
        <MainContext.Provider value={{ 
            loggedIn, setLoggedIn, 
            loading, setLoading, 
            userData, setUserData, 
            moments, setMoments, 
            handleLogin,
            friends, setFriends,
            conversations, setConversations,
            selectedFriendUid, setSelectedFriendUid,
            friendMoments, setFriendMoments,
            loadMoreFriendMoments,
            section, setSection,
            selectedConv, setSelectedConv,
            targetMomentUid, setTargetMomentUid,
            inItem, setInItem
        }}>
            <div className="app-root" data-tauri-drag-region>
                <div data-tauri-drag-region className="window-controls">
                    <button onClick={() => getCurrentWindow().minimize()}>—</button>
                    <button onClick={() => getCurrentWindow().close()}>✕</button>
                </div>
                {!loggedIn && !loading && <LoginScreen />}
                {loggedIn && !loading && <GlobalScreen />}
                {loading && <LoadingScreen />}
            </div>
        </MainContext.Provider>
    )
}

export default Popup;
