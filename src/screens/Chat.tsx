import { useState, useEffect, useRef } from 'react';
import cls from './Chat.module.scss';
import { useMainContext } from '../MainContext';
import { API } from '../services/api';
import { IoChevronBack, IoPaperPlaneOutline } from 'react-icons/io5';
import Spinner from '../components/Spinner';
import { storeGet } from '../lib/store';
import Avatar from '../components/Avatar';

export default function ChatScreen({ onBack }: { onBack?: () => void }) {
    const { userData, conversations, setConversations, selectedConv, setSelectedConv } = useMainContext();
    const [loadingConversations, setLoadingConversations] = useState(conversations.length === 0);
    const [messages, setMessages] = useState<any[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (userData?.localId && conversations.length === 0) {
            setLoadingConversations(true);
            storeGet("token").then(async token => {
                if (!token) return;
                try {
                    const dbs = ["locket", "(default)"];
                    const allDocs: any[] = [];
                    for (const db of dbs) {
                        try {
                            const resp = await API.fetchConversations(userData.localId, token as string, db);
                            const docs = resp.documents || [];
                            docs.forEach((d: any) => allDocs.push({ doc: d, db }));
                        } catch (e) {
                            console.warn(`[Chat] Fetch conversations failed for db ${db}:`, e);
                        }
                    }

                    console.log(`[Chat] Found ${allDocs.length} total conversation documents`);

                    const loadedConvs = await Promise.all(allDocs.map(async ({ doc, db }) => {
                        try {
                            const f = doc.fields;
                            const members = f.members?.arrayValue?.values?.map((v: any) => v.stringValue) || [];
                            const otherUid = members.find((id: string) => id !== userData.localId);
                            
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
                                    const userResp = await API.fetchUser(otherUid, token as string);
                                    if (userResp?.data) {
                                        baseConv.otherUser = userResp.data;
                                    }
                                } catch (e) {
                                    console.warn(`[Chat] Fetch user ${otherUid} failed, using placeholder`, e);
                                }
                            }
                            return baseConv;
                        } catch (e) {
                            console.error("[Chat] Normalize conv error", e);
                            return null;
                        }
                    }));

                    const validConvs = loadedConvs.filter(Boolean);
                    setConversations(validConvs);
                    import("../lib/store").then(m => m.storeSet('conversations_cache', validConvs));
                } catch (e) {
                    console.error("Fetch conversations main error", e);
                } finally {
                    setLoadingConversations(false);
                }
            });
        }
    }, [userData, conversations.length]);

    useEffect(() => {
        let socket: WebSocket | null = null;
        let pollInterval: any = null;

        if (selectedConv && userData) {
            setMessages([]);
            setLoadingMessages(true);
            
            storeGet("token").then(async token => {
                if (!token) return;
                
                const fetchHistory = async (showLoading = false) => {
                    if (showLoading) setLoadingMessages(true);
                    try {
                        let msgDocs: any[] = [];
                        const databases = ["(default)", "locket"];
                        const paths = [false, true];
                        
                        searchLoop:
                        for (const db of databases) {
                            for (const isGlobal of paths) {
                                try {
                                    const msgResp = await API.fetchMessages(userData.localId, selectedConv.id, token as string, db, isGlobal);
                                    if (msgResp.documents && msgResp.documents.length > 0) {
                                        msgDocs = msgResp.documents;
                                        break searchLoop; 
                                    }
                                } catch (e) {
                                    console.log(`[Chat] Search db ${db} failed, continuing...`);
                                }
                            }
                        }

                        console.log(`[Chat] Found ${msgDocs.length} messages for conv ${selectedConv.id}`);

                        const history = msgDocs.map((doc: any) => {
                            const f = doc.fields;
                            if (!f) return null;
                            const body = f.body?.stringValue || f.msg?.stringValue || f.text?.stringValue || f.caption?.stringValue || f.message?.stringValue || "";
                            const sender = f.sender?.stringValue || f.sender_uid?.stringValue || f.sender_id?.stringValue || "";
                            const thumbnail = f.thumbnail_url?.stringValue || f.thumbnail?.stringValue || f.moment_thumbnail_url?.stringValue;
                            const videoUrl = f.video_url?.stringValue || f.moment_video_url?.stringValue;
                            const ts = f.update_time?.timestampValue || f.created_at?.timestampValue || f.date?.timestampValue || f.sent_at?.timestampValue || doc.createTime;
                            const timestamp = ts ? new Date(ts).getTime() : Date.now();
                            return { msg: body, sender_uid: sender, timestamp, thumbnail, videoUrl, momentUid: f.moment_uid?.stringValue };
                        }).filter(Boolean).sort((a: any, b: any) => a.timestamp - b.timestamp);
                        
                        setMessages(prev => {
                            if (JSON.stringify(prev) === JSON.stringify(history)) return prev;
                            if (history.length > 0 && selectedConv.unreadCount > 0) {
                                const lastMsg = history[history.length - 1];
                                if (lastMsg) API.markAsRead(selectedConv.id, lastMsg.timestamp, token as string);
                                setConversations(prevConvs => prevConvs.map(c => 
                                    c.id === selectedConv.id ? { ...c, unreadCount: 0 } : c
                                ));
                            }
                            return history;
                        });
                    } catch (e) {
                        console.error("[Chat] Poll error", e);
                    } finally {
                        if (showLoading) setLoadingMessages(false);
                    }
                };

                await fetchHistory(true);
                pollInterval = setInterval(() => fetchHistory(false), 5000);

                const otherUid = selectedConv.otherUser?.uid;
                if (!otherUid) return;
                const wsUrl = `wss://api.locketcamera.com/wss_v2/chat?otherUserId=${otherUid}&userId=${userData.localId}&token=${token}`;
                socket = new WebSocket(wsUrl);
                
                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        let incoming: any[] = [];
                        if (Array.isArray(data.messages)) incoming = data.messages;
                        else if (data.message) incoming = [data.message];
                        else if (data.body && typeof data.body === 'object' && (data.body.msg || data.body.body || data.body.text)) incoming = [data.body];
                        else if (data.msg || data.body || data.text) incoming = [data];

                        if (incoming.length > 0) {
                            const newMsgs = incoming.map((m: any) => {
                                const sender = m.sender || m.sender_uid || m.sender_id;
                                const msgWithUser = m.with_user || m.recipient_uid || otherUid;
                                if (msgWithUser === otherUid || sender === otherUid) {
                                    if (sender && sender !== userData.localId) {
                                        API.markAsDelivered(selectedConv.id, m.created_at || m.date, token as string);
                                        API.markAsRead(selectedConv.id, m.created_at || m.date, token as string);
                                        setConversations(prevConvs => prevConvs.map(c => 
                                            c.id === selectedConv.id ? { ...c, unreadCount: 0 } : c
                                        ));
                                    }
                                    return {
                                        msg: m.body || m.msg || m.text || "",
                                        sender_uid: sender,
                                        timestamp: m.timestamp || (m.created_at ? new Date(m.created_at).getTime() : Date.now()),
                                        thumbnail: m.thumbnail_url || m.thumbnail || m.moment_thumbnail_url,
                                        videoUrl: m.video_url || m.moment_video_url,
                                        momentUid: m.moment_uid || m.moment_id
                                    };
                                }
                                return null;
                            }).filter(Boolean);

                            if (newMsgs.length > 0) {
                                setMessages(prev => {
                                    const filteredNew = newMsgs.filter(nm => nm && !prev.some(pm => pm && (pm.timestamp === nm.timestamp && pm.sender_uid === nm.sender_uid)));
                                    if (filteredNew.length === 0) return prev;
                                    return [...prev, ...filteredNew].sort((a, b) => a.timestamp - b.timestamp);
                                });
                            }
                        }
                    } catch (e) { console.error("[Chat] Socket message error", e); }
                };
            });

            return () => {
                if (socket) socket.close();
                if (pollInterval) clearInterval(pollInterval);
            };
        }
    }, [selectedConv, userData]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputText.trim() || !selectedConv) return;
        const msg = inputText.trim();
        const otherUid = selectedConv.otherUser?.uid;
        if (!otherUid) return;
        setInputText("");
        try {
            await API.sendChatMessage(otherUid, msg, null);
            setMessages(prev => [...prev, {
                msg,
                sender_uid: userData?.localId,
                timestamp: Date.now()
            }]);
        } catch (e) {
            console.error("Failed to send message", e);
        }
    };

    if (selectedConv) {
        return (
            <div className={cls.ChatView}>
                <div className={cls.Header}>
                    <div className={cls.BackBtn} onClick={() => setSelectedConv(null)}>
                        <IoChevronBack />
                    </div>
                    <Avatar src={selectedConv.otherUser?.profile_picture_url} name={`${selectedConv.otherUser?.first_name} ${selectedConv.otherUser?.last_name}`} size={40} />
                    <div className={cls.UserInfo}>
                        <div className={cls.Name}>{selectedConv.otherUser?.first_name} {selectedConv.otherUser?.last_name}</div>
                        <div className={cls.Status}>Online</div>
                    </div>
                </div>
                <div className={cls.MessageList}>
                    {loadingMessages && <div className={cls.Loading}><Spinner /></div>}
                    {!loadingMessages && messages.length === 0 && (
                        <div className={cls.Empty}>Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={clsx(cls.Message, m.sender_uid === userData?.localId ? cls.Me : cls.Them)}>
                            <div className={cls.Bubble}>
                                {(m.thumbnail || m.videoUrl) && (
                                    <div className={cls.MomentPreview}>
                                        {m.videoUrl ? (
                                            <video 
                                                src={m.videoUrl.replace('https://firebasestorage.googleapis.com', 'https://cdn.locketcamera.com')} 
                                                poster={m.thumbnail?.replace('https://firebasestorage.googleapis.com', 'https://cdn.locketcamera.com')}
                                                controls 
                                                playsInline
                                            />
                                        ) : (
                                            <img src={m.thumbnail?.replace('https://firebasestorage.googleapis.com', 'https://cdn.locketcamera.com')} alt="moment" />
                                        )}
                                    </div>
                                )}
                                {m.msg && <span>{m.msg}</span>}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <div className={cls.InputArea}>
                    <input 
                        placeholder="Aa" 
                        value={inputText} 
                        onChange={e => setInputText(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    />
                    <div className={cls.SendBtn} onClick={handleSendMessage}>
                        <IoPaperPlaneOutline />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cls.FriendListView}>
            <div className={cls.Header}>
                {onBack && (
                    <div className={cls.BackBtn} onClick={onBack}>
                        <IoChevronBack />
                    </div>
                )}
                <div style={{ flex: 1 }}>Đoạn chat</div>
            </div>
            <div className={cls.List}>
                {loadingConversations && <div className={cls.Loading}><Spinner /></div>}
                {!loadingConversations && conversations.length === 0 && <div className={cls.Empty}>Chưa có cuộc trò chuyện nào</div>}
                {conversations.map((c, i) => (
                    <div key={i} className={cls.FriendItem} onClick={() => setSelectedConv(c)}>
                        <Avatar src={c.otherUser?.profile_picture_url} name={`${c.otherUser?.first_name} ${c.otherUser?.last_name}`} size={48} />
                        <div className={cls.Info}>
                            <div className={cls.Name}>{c.otherUser?.first_name} {c.otherUser?.last_name}</div>
                            <div className={cls.LastMsg}>{c.latestMessage?.body || "Đã gửi một ảnh"}</div>
                        </div>
                        {c.unreadCount > 0 && <div className={cls.UnreadBadge}>{c.unreadCount}</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function clsx(...args: any[]) {
    return args.filter(Boolean).join(' ');
}
