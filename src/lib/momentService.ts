import { emit, emitTo } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { API } from '../services/api';
import { SavedMomentType } from '../types/moments';
import { UserType } from '../types/user';
import { storeDeleteMultiple, storeGet, storeSet } from './store';

type MomentCallback = (moments: SavedMomentType[]) => void;
type LogoutCallback = () => void;

let momentCallbacks: MomentCallback[] = [];
let logoutCallbacks: LogoutCallback[] = [];
let loopTimer: ReturnType<typeof setTimeout> | null = null;

export function onNewMoment(cb: MomentCallback): () => void {
    momentCallbacks.push(cb);
    return () => {
        momentCallbacks = momentCallbacks.filter(c => c !== cb);
    };
}

export function onLogout(cb: LogoutCallback): () => void {
    logoutCallbacks.push(cb);
    return () => {
        logoutCallbacks = logoutCallbacks.filter(c => c !== cb);
    };
}

async function notifyMomentCallbacks(): Promise<void> {
    const moments = (await storeGet<SavedMomentType[]>('moments')) ?? [];
    console.log(`[notifyMomentCallbacks] Notifying ${momentCallbacks.length} listeners with ${moments.length} moments`);
    momentCallbacks.forEach((cb, index) => {
        try {
            cb(moments);
        } catch (e) {
            console.error(`[notifyMomentCallbacks] Error in callback ${index}:`, e);
        }
    });
}

export async function addMomentLocally(moment: SavedMomentType): Promise<void> {
    const moments = (await storeGet<SavedMomentType[]>('moments')) ?? [];

    const exists = moments.some(m =>
        (m.md5 && m.md5 === moment.md5) ||
        (m.thumbnail_url === moment.thumbnail_url)
    );

    if (exists) return;

    const updatedMoments = [moment, ...moments];
    updatedMoments.sort((a, b) => b.seconds - a.seconds);

    await storeSet('moments', updatedMoments);
    await notifyMomentCallbacks();
}

async function pushSystemNotification(moment: SavedMomentType): Promise<void> {
    try {
        const enabled = (await storeGet<boolean>('notifications_enabled')) ?? true;
        if (!enabled) return;

        const hasVideo = !!moment.video_url;
        const title = moment.user?.username ?? 'Unknown';
        const body = moment.caption?.trim()
            ? moment.caption
            : hasVideo ? 'Sent a new video moment' : 'Sent a new moment';

        console.log(`[Notification] Pushing system notification: ${title} - ${body}`);
        const win = await WebviewWindow.getByLabel("notification");
        if (win) {
            await win.show();
            await win.setFocus();
        }
        emitTo("notification", "show-notification", {
            title, body,
            avatar: moment.user?.avatar,
            type: "moment",
            uid: moment.user?.uid,
            momentUid: moment.moment_uid
        });
    } catch (e) {
        console.error("pushSystemNotification error", e);
    }
}

export async function testNotification(): Promise<void> {
    console.log("[Notification] Triggering test notification");
    const win = await WebviewWindow.getByLabel("notification");
    if (win) {
        await win.show();
        await win.setFocus();
    }
    emitTo("notification", "show-notification", {
        title: "Locket Desktop Test",
        body: "Đây là thông báo thử nghiệm từ Locket Desktop!",
        avatar: "https://locket.camera/icon.png"
    });
    emit("show-notification", {
        title: "Locket Desktop Test",
        body: "Đây là thông báo thử nghiệm từ Locket Desktop!",
        avatar: "https://locket.camera/icon.png"
    });
}

async function pushMessageNotification(conv: any): Promise<void> {
    try {
        const enabled = (await storeGet<boolean>('notifications_enabled')) ?? true;
        if (!enabled) {
            console.log("[Notification] Message notifications disabled");
            return;
        }

        const title = `${conv.otherUser?.first_name || ''} ${conv.otherUser?.last_name || ''}`.trim();
        const body = conv.latestMessage?.body || "Sent you a message";

        console.log(`[Notification] Pushing message notification: ${title} - ${body}`);
        const win = await WebviewWindow.getByLabel("notification");
        if (win) {
            await win.show();
            await win.setFocus();
        }
        emitTo("notification", "show-notification", {
            title, body,
            avatar: conv.otherUser?.profile_picture_url,
            type: "message",
            uid: conv.otherUser?.uid
        });
    } catch (e) {
        console.error("pushMessageNotification error", e);
    }
}

async function refreshToken(rT: string): Promise<{ token: string; refreshToken: string } | null> {
    try {
        const newToken = await API.refreshToken(rT);
        if (!newToken?.access_token) {
            await storeDeleteMultiple(['token', 'refreshToken', 'user']);
            logoutCallbacks.forEach(cb => cb());
            return null;
        }
        await storeSet('token', newToken.access_token);
        await storeSet('refreshToken', newToken.refresh_token);
        return { token: newToken.access_token, refreshToken: newToken.refresh_token };
    } catch {
        return null;
    }
}

function parseFirestoreValue(v: any): any {
    if (!v) return null;
    if (v.stringValue !== undefined) return v.stringValue;
    if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
    if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
    if (v.booleanValue !== undefined) return v.booleanValue;
    if (v.timestampValue !== undefined) return v.timestampValue;
    if (v.mapValue !== undefined) {
        const fields = v.mapValue.fields || {};
        const obj: any = {};
        for (const key in fields) {
            obj[key] = parseFirestoreValue(fields[key]);
        }
        return obj;
    }
    if (v.arrayValue !== undefined) {
        return (v.arrayValue.values || []).map(parseFirestoreValue);
    }
    return null;
}

function replaceFirebaseWithCDN(url: string | undefined | null) {
    if (!url) return null;
    return url.replace(
        "https://firebasestorage.googleapis.com",
        "https://cdn.locketcamera.com"
    );
}

export function normalizeMoment(doc: any) {
    if (!doc || !doc.fields) return null;

    const f = doc.fields;
    const overlays = f.overlays?.arrayValue?.values || [];
    const overlay = overlays[0]?.mapValue?.fields || {};
    const overlayData = overlay.data?.mapValue?.fields || {};

    const backgroundFields = overlayData.background?.mapValue?.fields || {};

    const getIsPublic = (f: any) => {
        const sentToAll = parseFirestoreValue(f.sent_to_all);
        const sentToSelfOnly = parseFirestoreValue(f.sent_to_self_only);
        if (sentToSelfOnly) return false;
        if (sentToAll) return true;
        return false;
    };

    const moment_uid = f.canonical_uid?.stringValue || doc.name?.split("/").pop();

    return {
        moment_uid: moment_uid,
        caption: f.caption?.stringValue || overlay.alt_text?.stringValue || "",
        user: f.user?.stringValue || null,
        thumbnailUrl: replaceFirebaseWithCDN(f.thumbnail_url?.stringValue),
        videoUrl: replaceFirebaseWithCDN(f.video_url?.stringValue),
        md5: f.md5?.stringValue || null,
        date: f.date?.timestampValue || doc.createTime || null,
        isPublic: getIsPublic(f),
        overlays: {
            id: overlay.overlay_id?.stringValue || null,
            type: overlay.overlay_type?.stringValue || null,
            text: overlayData.text?.stringValue || null,
            textColor: overlayData.text_color?.stringValue || null,
            maxLines: overlayData.max_lines?.integerValue
                ? parseInt(overlayData.max_lines.integerValue, 10)
                : null,
            background: {
                materialBlur: overlayData.background?.mapValue?.fields?.material_blur?.stringValue || null,
                colors: parseFirestoreValue(backgroundFields.colors) || [],
            },
            icon: parseFirestoreValue(overlayData.icon),
            payload: parseFirestoreValue(overlayData.payload),
        },
        createTime: doc.createTime || null,
        updateTime: doc.updateTime || null,
    };
}

let nextPageToken: string | null = null;
let isFetchingMore = false;
let hasReachedEnd = false;

export async function fetchLatestMoment(isLoadMore = false): Promise<string> {
    if (isLoadMore && isFetchingMore) return "Already fetching";
    if (isLoadMore && hasReachedEnd) return "No more moments to load";
    if (isLoadMore) isFetchingMore = true;

    let token = await storeGet<string>('token');
    let rToken = await storeGet<string>('refreshToken');

    if (!token || !rToken) {
        if (isLoadMore) isFetchingMore = false;
        return "No token";
    }

    let isOkay = false;

    try {
        const accInfo = await API.getAccountInfo(token);
        if (accInfo && accInfo.users) {
            await storeSet('user', accInfo.users[0] as UserType);
            isOkay = true;
        }
    } catch {
        const refreshed = await refreshToken(rToken);
        if (refreshed) {
            token = refreshed.token;
            rToken = refreshed.refreshToken;
            isOkay = true;
        }
    }

    if (!isOkay) return "Token refresh failed";

    try {
        const user = await storeGet<UserType>('user');
        if (!user?.localId) return "No user localId";

        let normalizedMoments: SavedMomentType[] = [];

        if (!isLoadMore) {
            console.log("[fetchLatestMoment] Using getLatestMomentV2 RPC...");
            const rpcResp = await API.fetchLatestMoment(token);
            const momentsArray = rpcResp.data || (rpcResp as any).moments || [];

            const friends = (await storeGet<any[]>('friends_cache')) ?? [];
            const currentUser = await storeGet<UserType>('user');

            normalizedMoments = momentsArray.map((m: any) => {
                const uUid = typeof m.user === 'string' ? m.user : m.user?.uid;
                let username = "Unknown User";
                let avatar = "";

                if (typeof m.user === 'object' && m.user?.first_name) {
                    username = `${m.user.first_name} ${m.user.last_name}`;
                    avatar = m.user.profile_picture_url || "";
                } else {
                    const friendInfo = friends.find((f: any) => f.uid === uUid);
                    if (friendInfo) {
                        username = `${friendInfo.first_name} ${friendInfo.last_name}`;
                        avatar = friendInfo.profile_picture_url || "";
                    } else if (uUid === currentUser?.localId) {
                        username = "Bạn";
                        avatar = currentUser?.photoUrl || "";
                    }
                }

                return {
                    user: { username, avatar, uid: uUid },
                    md5: m.md5 || m.canonical_uid || m.moment_uid,
                    thumbnail_url: m.thumbnail_url || "",
                    ...(m.video_url ? { video_url: m.video_url } : {}),
                    seconds: m.date?._seconds ? m.date._seconds * 1000 : (m.date ? new Date(m.date).getTime() : Date.now()),
                    caption: m.caption || "",
                    moment_uid: m.canonical_uid || m.moment_uid,
                };
            });
        } else {
            let url = `https://firestore.googleapis.com/v1/projects/locket-4252a/databases/locket/documents/history/${user.localId}/entries?orderBy=date%20desc&pageSize=30`;
            if (nextPageToken) url += `&pageToken=${nextPageToken}`;

            const response = await tauriFetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                isFetchingMore = false;
                return `Firestore Error ${response.status}`;
            }

            const historyResp = await response.json() as any;
            nextPageToken = historyResp.nextPageToken || null;
            if (!nextPageToken) hasReachedEnd = true;

            const documents = historyResp.documents || [];
            const rawNormalized = documents.map((doc: any) => normalizeMoment(doc)).filter(Boolean);

            const friends = (await storeGet<any[]>('friends_cache')) ?? [];

            for (const rn of rawNormalized) {
                if (!rn) continue;
                const uUid = rn.user;
                const friendInfo = friends.find((f: any) => f.uid === uUid);

                let username = "Unknown User";
                let avatar = "";

                if (friendInfo) {
                    username = `${friendInfo.first_name} ${friendInfo.last_name}`;
                    avatar = friendInfo.profile_picture_url || "";
                } else if (uUid === user.localId) {
                    username = "Bạn";
                    avatar = user.photoUrl || "";
                }

                normalizedMoments.push({
                    user: { username, avatar, uid: uUid },
                    md5: rn.md5 || rn.moment_uid,
                    thumbnail_url: rn.thumbnailUrl || "",
                    ...(rn.videoUrl ? { video_url: rn.videoUrl } : {}),
                    seconds: rn.date ? new Date(rn.date).getTime() : Date.now(),
                    caption: rn.caption || "",
                    moment_uid: rn.moment_uid,
                });
            }
        }

        const moments = (await storeGet<SavedMomentType[]>('moments')) ?? [];
        const existingMd5s = new Set(moments.map(m => m.md5).filter(Boolean) as string[]);
        const existingUrls = new Set(moments.map(m => m.thumbnail_url).filter(Boolean) as string[]);
        const processedMoments: SavedMomentType[] = [];

        for (const nm of normalizedMoments) {
            if (!nm) continue;
            if (existingMd5s.has(nm.md5 as string) || existingUrls.has(nm.thumbnail_url as string)) continue;
            processedMoments.push(nm);
        }

        if (processedMoments.length === 0) {
            if (isLoadMore) isFetchingMore = false;
            return "Success, but no NEW moments to add";
        }

        let updatedMoments: SavedMomentType[] = [];
        if (isLoadMore) {
            updatedMoments = [...moments, ...processedMoments];
            isFetchingMore = false;
        } else {
            updatedMoments = [...processedMoments, ...moments];
            await pushSystemNotification(processedMoments[0]);
        }

        const uniqueMoments = Array.from(new Map(updatedMoments.map(m => [m.md5, m])).values());
        uniqueMoments.sort((a, b) => b.seconds - a.seconds);

        await storeSet('moments', uniqueMoments);
        await notifyMomentCallbacks();

        return `Success! Processed ${processedMoments.length} moments`;
    } catch (e: any) {
        console.error("fetchLatestMoment error", e);
        if (isLoadMore) isFetchingMore = false;
        return "Exception: " + e.message;
    }
}

export async function fetchMoreMoments(): Promise<void> {
    await fetchLatestMoment(true);
}

export async function deleteMoment(momentUid: string, ownerUid: string): Promise<boolean> {
    try {
        const token = await storeGet<string>('token');
        if (!token) return false;

        await API.deleteMoment(momentUid, ownerUid, token);

        const moments = (await storeGet<SavedMomentType[]>('moments')) ?? [];
        const filtered = moments.filter(m => m.md5 !== momentUid && m.thumbnail_url?.indexOf(momentUid) === -1);
        await storeSet('moments', filtered);
        await notifyMomentCallbacks();
        return true;
    } catch (e) {
        console.error("deleteMoment error:", e);
        return false;
    }
}

export async function clearMoments(): Promise<void> {
    await storeDeleteMultiple(['moments', 'lastMD5']);
    nextPageToken = null;
    hasReachedEnd = false;
    await notifyMomentCallbacks();
}

export async function logout(): Promise<void> {
    await storeDeleteMultiple(['token', 'refreshToken', 'user', 'lastMD5', 'moments', 'friends_cache', 'conversations_cache']);
    nextPageToken = null;
    hasReachedEnd = false;
    await notifyMomentCallbacks();
    logoutCallbacks.forEach(cb => cb());
}

let lastUnreadCount: Record<string, number> = {};
let lastNotifiedMsgTime: Record<string, string> = {};
let isFirstPoll = true;

async function pollConversations(): Promise<void> {
    const token = await storeGet<string>('token');
    const user = await storeGet<UserType>('user');
    if (!token || !user) return;

    try {
        const dbs = ["locket", "(default)"];
        for (const db of dbs) {
            try {
                const resp = await API.fetchConversations(user.localId, token, db);
                const docs = resp.documents || [];
                if (docs.length === 0) continue;

                for (const doc of docs) {
                    try {
                        const f = doc.fields;
                        const convId = doc.name?.split('/').pop();
                        if (!convId) continue;

                        const unreadCount = parseInt(f.unread_count?.integerValue || "0", 10);
                        const latest = f.latest_message?.mapValue?.fields;
                        const msgTime = latest?.created_at?.timestampValue || latest?.date?.timestampValue || "";

                        if (!isFirstPoll && unreadCount > (lastUnreadCount[convId] || 0)) {
                            if (lastNotifiedMsgTime[convId] !== msgTime) {
                                const members = f.members?.arrayValue?.values?.map((v: any) => v.stringValue) || [];
                                const otherUid = members.find((id: string) => id !== user.localId);
                                if (otherUid) {
                                    const userResp = await API.fetchUser(otherUid, token);
                                    const convData = {
                                        otherUser: userResp?.data,
                                        latestMessage: {
                                            body: latest?.body?.stringValue || latest?.msg?.stringValue || latest?.text?.stringValue || "Sent you a message"
                                        }
                                    };
                                    await pushMessageNotification(convData);
                                    lastNotifiedMsgTime[convId] = msgTime;
                                }
                            }
                        }
                        lastUnreadCount[convId] = unreadCount;
                    } catch (innerErr) {
                        console.error("Error processing conversation for notification", innerErr);
                    }
                }
            } catch (err) {
                console.log(`[Polling] Skip db ${db} due to error`);
            }
        }
        isFirstPoll = false;
    } catch (e) {
        console.error("pollConversations error", e);
    }
}

export function startMomentPolling(): void {
    if (loopTimer !== null) return;
    // Set a placeholder to prevent multiple loops from starting
    loopTimer = setTimeout(() => { }, 0);

    const loop = async () => {
        try {
            console.log("[Polling] Starting poll...");
            const momentResult = await fetchLatestMoment();
            console.log("[Polling] fetchLatestMoment result:", momentResult);

            await pollConversations();
            console.log("[Polling] pollConversations completed");
        } catch (e) {
            console.error("[Polling] Error in loop:", e);
        } finally {
            loopTimer = setTimeout(loop, 20_000); // Polling every 20s
        }
    };
    loop();
}

export function stopMomentPolling(): void {
    if (loopTimer !== null) {
        clearTimeout(loopTimer);
        loopTimer = null;
    }
}

export async function fetchFriendMoments(friendUid: string): Promise<SavedMomentType[]> {
    const token = await storeGet<string>('token');
    const user = await storeGet<UserType>('user');
    const friendsRaw = (await storeGet<any[]>('friends_cache')) ?? [];

    if (!token || !user) return [];

    try {
        // 1. Get latest from RPC - Exclude other friends AND the current user
        const friends = friendsRaw;
        const isSelf = friendUid === user.localId;

        let excludedUsers: string[] = [];
        if (isSelf) {
            // Nếu là chính mình, loại trừ tất cả bạn bè
            excludedUsers = friends.map(f => f.uid);
        } else {
            // Nếu là bạn bè, loại trừ các bạn bè khác VÀ chính mình
            excludedUsers = [...friends.map(f => f.uid).filter(uid => uid !== friendUid), user.localId];
        }

        const resp = await API.fetchLatestMoment(token, excludedUsers);
        const latestData = resp.data || [];

        // 2. Get history from runQuery
        const historyDocs = await API.fetchFriendMomentsV2(user.localId, friendUid, token);
        const normalizedHistory = historyDocs.map((doc: any) => normalizeMoment(doc)).filter(Boolean);

        // 3. Combine
        const combinedMoments: SavedMomentType[] = [];
        const seenUids = new Set();

        const processItem = (nm: any, isRpc: boolean) => {
            const uid = isRpc ? nm.canonical_uid : nm.id;
            if (seenUids.has(uid)) return;
            seenUids.add(uid);

            const fUid = isRpc ? nm.user : nm.user;
            const friendInfo = friends.find(f => f.uid === fUid);

            // Nếu không tìm thấy bạn bè, kiểm tra xem có phải chính mình không
            let username = "Unknown User";
            let avatar = "";

            if (friendInfo) {
                username = `${friendInfo.first_name} ${friendInfo.last_name}`;
                avatar = friendInfo.profile_picture_url || "";
            } else if (fUid === user.localId) {
                username = "Bạn";
                avatar = user.photoUrl || "";
            }

            combinedMoments.push({
                user: { username, avatar, uid: fUid },
                md5: nm.md5 || uid,
                thumbnail_url: isRpc ? nm.thumbnail_url : nm.thumbnailUrl,
                ...((isRpc ? nm.video_url : nm.videoUrl) ? { video_url: isRpc ? nm.video_url : nm.videoUrl } : {}),
                seconds: isRpc ? (nm.date?._seconds * 1000) : (nm.date ? new Date(nm.date).getTime() : Date.now()),
                caption: nm.caption || "",
                moment_uid: uid,
            });
        };

        latestData.forEach((item: any) => processItem(item, true));
        normalizedHistory.forEach((item: any) => processItem(item, false));

        combinedMoments.sort((a, b) => b.seconds - a.seconds);
        return combinedMoments;
    } catch (e) {
        console.error("fetchFriendMoments error", e);
        return [];
    }
}

export async function fetchMoreFriendMoments(friendUid: string, lastMoment: SavedMomentType): Promise<SavedMomentType[]> {
    const token = await storeGet<string>('token');
    const user = await storeGet<UserType>('user');
    const friends = (await storeGet<any[]>('friends_cache')) ?? [];

    if (!token || !user || !lastMoment) return [];

    try {
        const lastDate = new Date(lastMoment.seconds).toISOString();
        const historyDocs = await API.fetchFriendMomentsV2(user.localId, friendUid, token, lastDate);
        const normalizedHistory = historyDocs.map((doc: any) => normalizeMoment(doc)).filter(Boolean);

        const newMoments: SavedMomentType[] = [];
        for (const nm of normalizedHistory) {
            if (!nm) continue;
            const fUid = nm.user;
            const friendInfo = friends.find((f: any) => f.uid === fUid);

            let username = "Unknown User";
            let avatar = "";

            if (friendInfo) {
                username = `${friendInfo.first_name} ${friendInfo.last_name}`;
                avatar = friendInfo.profile_picture_url || "";
            } else if (fUid === user.localId) {
                username = "Bạn";
                avatar = user?.photoUrl || "";
            }

            newMoments.push({
                user: { username, avatar, uid: fUid },
                md5: nm.md5 || nm.moment_uid,
                thumbnail_url: nm.thumbnailUrl || "",
                ...(nm.videoUrl ? { video_url: nm.videoUrl } : {}),
                seconds: nm.date ? new Date(nm.date).getTime() : Date.now(),
                caption: nm.caption || "",
                moment_uid: nm.moment_uid,
            });
        }
        return newMoments;
    } catch (e) {
        console.error("fetchMoreFriendMoments error", e);
        return [];
    }
}
