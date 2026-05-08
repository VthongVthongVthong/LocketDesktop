import { API } from '../services/api';
import { randomString } from '../utils/string';
import { storeGet, storeSet } from '../lib/store';
import { fetch } from '@tauri-apps/plugin-http';
import { UserType } from '../types/user';
import { SavedMomentType } from '../types/moments';

async function uploadFileToFirebase(userId: string, token: string, fileBuffer: Blob, path: string, contentType: string): Promise<string> {
    console.log(`Uploading ${contentType} to ${path} (${fileBuffer.size} bytes)...`);
    const bucket = path.includes("videos/") ? "locket-video" : "locket-img"; // confirmed by user traffic
    const initResp = await fetch(
        `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?uploadType=resumable&name=${encodeURIComponent(path)}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json; charset=UTF-8",
                Accept: "application/json",
                "X-Goog-Upload-Protocol": "resumable",
                "X-Goog-Upload-Content-Length": fileBuffer.size.toString(),
                "X-Firebase-Storage-Version": "ios/10.23.1",
                "User-Agent": "Locket/2.34.0 (com.locket.Locket; build:3482; iOS 18.2.0) Alamofire/5.7.1",
                "X-Goog-Upload-Content-Type": contentType,
                "X-Goog-Upload-Command": "start",
                "X-Firebase-Gmpid": "1:641029076083:ios:cc8eb46290d69b234fa606",
                "X-Firebase-AppCheck": "eyJraWQiOiJrMnhhbUEiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxOjY0MTAyOTA3NjA4Mzppb3M6Y2M4ZWI0NjI5MGQ2OWIyMzRmYTYwNiIsImF1ZCI6WyJwcm9qZWN0cy82NDEwMjkwNzYwODMiLCJwcm9qZWN0cy82NDEwMjkwNzYwODMiXSwicHJvdmlkZXIiOiJkZXZpY2VfY2hlY2tfZGV2aWNlX2lkZW50aWZpY2F0aW9uIiwiaXNzIjoiaHR0cHM6Ly9maXJlYmFzZWFwcGNoZWNrLmdvb2dsZWFwaXMuY29tLzY0MTAyOTA3NjA4MyIsImV4cCI6MTc3ODIzOTAyOSwiaWF0IjoxNzc4MjM1NDI5LCJqdGkiOiJJTGc3WUE2S2ZMS1FQSjQ2RXAtdE9OMW5IbGV0S2RlaGNVdUxBUW1zeWJvIn0.OQf-7_GLe-AmHkfZDaGtvFWG33Of08Cht3gci2W3jkbINjLa4t-QClcBNn-kSXXnJIDlIAePWdLPWkzwZiDy91DcjO6brvbqrqxPu-PGJSeAFZMBh8LCdj2MZFhcT_pV4V4XzkuJlUMmfDkeX3XIkbnBEFejNZLjD7gNsXkqZuClCIOZ4gPBDBt7fdIrMutIyLILB50mX2_0GA7gB1ErULk_PW4f6knnlZ8Nzefo4Sd_7JO6FkSQKRbxj-IJu3kF8NWk_NX1qtUlaMdzF0u7m09y9LG68gBx7ZAQ3Ki2Q1x7cZHba2n7jxCzgqvhG90HP24LYosA8xItBIwKqujI-aoNhtM9fgsqF2plGGkEJJbmMbQuE9MuZ7jay_Q1eD65gyI7TICk1PSzq0zBNiZoQkkPuOrI4-i3HjNh_YIOI0MzFCKBs8Zd9eYyJP-dwEhiE31cIg6VXPe11IGSNSmyVsCll44MLBEKrl00cUYo7NUap3IjETEEbcIXIU_p--qJ",
                "Firebase-Instance-ID-Token": "epbcasHfpEr5kIRjBIZIb_:APA91bEV53O4nMHL5JBCcIPpwc7ci4lW9F2IZ2xwyKVr8V6O3nvskMxodyx6-I657Qv3X6mqSURi5JQ2z4G0Vlh1RUH8LGNGBpdaA_4xYeecQll2YkPM_ow",
            },
            method: "POST",
            body: JSON.stringify({
                name: path,
                contentType: contentType,
                bucket: bucket,
                cacheControl: "public, max-age=604800",
                metadata: { creator: userId, visibility: "private" }
            })
        }
    );

    if (!initResp.ok) {
        const body = await initResp.text().catch(() => "");
        console.error(`[Upload] Init failed (${initResp.status}):`, body);
        throw new Error(`init upload failed ${initResp.status}: ${body.slice(0, 120)}`);
    }
    console.log(`[Upload] Init success, status: ${initResp.status}`);

    const uploadEndpoint = initResp.headers.get("X-Goog-Upload-URL");
    if (!uploadEndpoint) throw new Error("no upload URL in response headers");

    const uploadResp = await fetch(uploadEndpoint, {
        headers: {
            "Content-Type": "application/octet-stream",
            "X-Goog-Upload-Command": "upload, finalize",
            "X-Goog-Upload-Offset": "0",
            "Upload-Incomplete": "?0",
            "Upload-Draft-Interop-Version": "3",
            "User-Agent": "Locket/2.34.0 (com.locket.Locket; build:3482; iOS 18.2.0) Alamofire/5.7.1",
        },
        method: "PUT",
        body: fileBuffer
    });

    if (!uploadResp.ok) {
        const body = await uploadResp.text().catch(() => "");
        console.error(`[Upload] PUT failed (${uploadResp.status}):`, body);
        throw new Error(`PUT upload failed ${uploadResp.status}: ${body.slice(0, 120)}`);
    }
    console.log(`[Upload] PUT success, status: ${uploadResp.status}`);

    const fileMetaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}`;
    const getUrlResp = await fetch(fileMetaUrl, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8",
            Accept: "application/json",
            "User-Agent": "com.locket.Locket/1.43.1 iPhone/18.1 hw/iPhone15_3 (GTMSUF/1)",
        }
    });

    if (!getUrlResp.ok) {
        const body = await getUrlResp.text().catch(() => "");
        throw new Error(`get URL failed ${getUrlResp.status}: ${body.slice(0, 120)}`);
    }

    const urlJson = await getUrlResp.json();
    const downloadToken = urlJson.downloadTokens;
    if (!downloadToken) throw new Error("no downloadToken");

    return `${fileMetaUrl}?alt=media&token=${downloadToken}`;
}

async function refreshIfNeeded(): Promise<string> {
    const refreshTokenStr = await storeGet<string>('refreshToken');
    if (!refreshTokenStr) throw new Error("no refresh token");
    const newToken = await API.refreshToken(refreshTokenStr);
    if (!newToken) throw new Error("refresh token failed");
    await storeSet('token', newToken.id_token);
    await storeSet('refreshToken', newToken.refresh_token);
    return newToken.id_token;
}

export async function uploadImageAndPost(fileBuffer: Blob, caption: string): Promise<SavedMomentType> {
    const user = await storeGet<UserType>('user');
    if (!user) throw new Error("no user");
    const token = await refreshIfNeeded();

    const imageName = randomString(20) + ".webp";
    const path = `users/${user.localId}/moments/thumbnails/${imageName}`;
    const finalImageUrl = await uploadFileToFirebase(user.localId, token, fileBuffer, path, "image/webp");

    const createPost = await API.createPost(finalImageUrl, caption, token);
    if (!createPost) throw new Error("post failed");

    const newMoment: SavedMomentType = {
        user: { username: user.displayName || "Me", avatar: user.photoUrl || "", uid: user.localId },
        md5: randomString(32),
        thumbnail_url: finalImageUrl,
        seconds: Date.now(),
        caption: caption
    };

    return newMoment;
}

export async function uploadVideoAndPost(videoBuffer: Blob, thumbBuffer: Blob, caption: string): Promise<SavedMomentType> {
    const user = await storeGet<UserType>('user');
    if (!user) throw new Error("no user");
    const token = await refreshIfNeeded();

    const baseName = randomString(20);
    const thumbPath = `users/${user.localId}/moments/thumbnails/${baseName}.webp`;
    
    // Use the actual mime type of the video blob for extension and content-type
    const mimeType = videoBuffer.type || "video/mp4";
    const extension = mimeType.includes("webm") ? "webm" : "mp4";
    const videoPath = `users/${user.localId}/moments/videos/${baseName}.${extension}`;

    console.log(`Starting video upload: ${videoPath} (${mimeType})`);

    const [thumbUrl, videoUrl] = await Promise.all([
        uploadFileToFirebase(user.localId, token, thumbBuffer, thumbPath, "image/webp"),
        uploadFileToFirebase(user.localId, token, videoBuffer, videoPath, mimeType)
    ]);

    const createPost = await API.createVideoPost(videoUrl, thumbUrl, caption, token);
    if (!createPost) throw new Error("post failed");

    const newMoment: SavedMomentType = {
        user: { username: user.displayName || "Me", avatar: user.photoUrl || "", uid: user.localId },
        md5: randomString(32),
        thumbnail_url: thumbUrl,
        video_url: videoUrl,
        seconds: Date.now(),
        caption: caption
    };

    return newMoment;
}
