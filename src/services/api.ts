import { fetch } from "@tauri-apps/plugin-http"
import { ExchangeCustomTokenPayloadType, ExchangeCustomTokenResponseType, LoginPayloadType, LoginResponseType, RefreshTokenPayloadType, RefreshTokenResponseType, RequestPhoneOTPResponseType, VerifyPhoneOTPResponseType } from "../types/auth"
import { MomentType } from "../types/moments"
import { GetAccountInfoResponseType, UserInfoType } from "../types/user"
import { storeGet } from "../lib/store"

export type ResponseError<T> = {
    error: T
}

export type GenericError = {
    code: number,
    message: string,
    errors?: {
        message: string,
        domain: string,
        reason: string
    }[]
}

const FIREBASE_API_KEY = "AIzaSyCQngaaXQIfJaH0aS2l7REgIjD7nL431So";

// Corrected AppCheck token (removed corruption)
const APP_CHECK_TOKEN = 'eyJraWQiOiJrMnhhbUEiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxOjY0MTAyOTA3NjA4Mzppb3M6Y2M4ZWI0NjI5MGQ2OWIyMzRmYTYwNiIsImF1ZCI6WyJwcm9qZWN0cy82NDEwMjkwNzYwODMiLCJwcm9qZWN0cy9sb2NrZXQtNDI1MmEiXSwicHJvdmlkZXIiOiJkZXZpY2VfY2hlY2tfZGV2aWNlX2lkZW50aWZpY2F0aW9uIiwiaXNzIjoiaHR0cHM6Ly9maXJlYmFzZWFwcGNoZWNrLmdvb2dsZWFwaXMuY29tLzY0MTAyOTA3NjA4MyIsImV4cCI6MTc3ODIzOTAyOSwiaWF0IjoxNzc4MjM1NDI5LCJqdGkiOiJJTGc3WUE2S2ZMS1FQSjQ2RXAtdE9OMW5IbGV0S2RlaGNVdUxBUW1zeWJvIn0.OQf-7_GLe-AmHkfZDaGtvFWG33Of08Cht3gci2W3jkbINjLa4t-QClcBNn-kSXXnJIDlIAePWdLPWkzwZiDy91DcjO6brvbqrqxPu-PGJSeAFZMBh8LCdj2MZFhcT_pV4V4XzkuJlUMmfDkeX3XIkbnBEFejNZLjD7gNsXkqZuClCIOZ4gPBDBt7fdIrMutIyLILB50mX2_0GA7gB1ErULk_PW4f6knnlZ8Nzefo4Sd_7JO6FkSQKRbxj-IJu3kF8NWk_NX1qtUlaMdzF0u7m09y9LG68gBx7ZAQ3Ki2Q1x7cZHba2n7jxCzgqvhG90HP24LYosA8xItBIwKqujI-aoNhtM9fgsqF2plGGkEJJbmMbQuE9MuZ7jay_Q1eD65gyI7TICk1PSzq0zBNiZoQkkPuOrI4-i3HjNh_YIOI0MzFCKBs8Zd9eYyJP-dwEhiE31cIg6VXPe11IGSNSmyVsCll44MLBEKrl00cUYo7NUap3IjETEEbcIXIU_p--qJ';

export async function fetchFirebase<Request, ResponseOk>({
    endpoint, method, body, token, noKey = false
}: {
    endpoint: string,
    method: string,
    body?: Request,
    token?: string,
    noKey?: boolean
}) {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Accept-Language', 'vi-VN,vi;q=0.9');
    headers.append('User-Agent', 'FirebaseAuth.iOS/10.23.1 com.locket.Locket/1.82.0 iPhone/18.0 hw/iPhone12_1');
    headers.append('X-Ios-Bundle-Identifier', 'com.locket.Locket');
    headers.append('X-Client-Version', 'iOS/FirebaseSDK/10.23.1/FirebaseCore-iOS');
    headers.append('X-Firebase-GMPID', '1:641029076083:ios:cc8eb46290d69b234fa606');
    headers.append('X-Firebase-Client', 'H4sIAAAAAAAAAKtWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA');
    headers.append('X-Firebase-AppCheck', APP_CHECK_TOKEN);

    if (token) {
        headers.append('Authorization', `Bearer ${token}`);
    }

    const url = noKey ? endpoint : `${endpoint}?key=${FIREBASE_API_KEY}`;
    
    const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body)
    });

    const text = await response.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch (e) {
        throw new Error(`Invalid JSON from Firebase: ${text}`);
    }

    if (response.status !== 200) {
        console.error(`[API] fetchFirebase error: ${response.status} for ${endpoint}`, json);
        throw json;
    }
    console.log(`[API] fetchFirebase success: ${endpoint}`);
    return json as ResponseOk;
}

export async function fetchLocket<Response>({
    endpoint, method, body, token
}: {
    endpoint: string,
    method: string,
    body?: any,
    token?: string
}) {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    const authToken = token ?? await storeGet<string>('token');
    if (authToken) {
        headers.append('Authorization', `Bearer ${authToken}`);
    }

    headers.append('User-Agent', 'FirebaseAuth.iOS/10.23.1 com.locket.Locket/1.82.0 iPhone/18.0 hw/iPhone12_1');
    headers.append('X-Locket-Version', '1.82.0');
    headers.append('X-Firebase-GMPID', '1:641029076083:ios:cc8eb46290d69b234fa606');
    headers.append('Firebase-Instance-ID-Token', 'epbcasHfpEr5kIRjBIZIb_:APA91bEV53O4nMHL5JBCcIPpwc7ci4lW9F2IZ2xwyKVr8V6O3nvskMxodyx6-I657Qv3X6mqSURi5JQ2z4G0Vlh1RUH8LGNGBpdaA_4xYeecQll2YkPM_ow');
    headers.append('X-Firebase-AppCheck', APP_CHECK_TOKEN);

    const response = await fetch(`https://api.locketcamera.com/${endpoint}`, {
        method,
        headers,
        body: JSON.stringify(body)
    });

    const text = await response.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch (e) {
        throw new Error(`Invalid JSON from Locket: ${text}`);
    }

    if (response.status !== 200) {
        console.error(`[API] fetchLocket error: ${response.status} for ${endpoint}`, json);
        throw json;
    }
    console.log(`[API] fetchLocket success: ${endpoint}`);
    return (json.result ?? json) as Response;
}

export const API = {
    login: (email: string, password: string) => fetchFirebase<LoginPayloadType, LoginResponseType>({
        endpoint: "https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword",
        method: "POST",
        body: {
            email,
            password,
            returnSecureToken: true,
            clientType: "CLIENT_TYPE_IOS"
        }
    }),
    requestOTP: (phoneE164: string) => fetchLocket<RequestPhoneOTPResponseType>({
        endpoint: "sendVerificationCode",
        method: "POST",
        body: {
            data: {
                deviceModel: "iPhone12,1",
                operation: "hybrid",
                phone: phoneE164,
                use_password_if_available: false
            }
        }
    }),
    verifyOTP: (phoneE164: string, code: string) => fetchLocket<VerifyPhoneOTPResponseType>({
        endpoint: "checkVerificationCode",
        method: "POST",
        body: {
            data: {
                phone: phoneE164,
                verification_code: code
            }
        }
    }),
    exchangeOTPTokenForIDToken: (token: string) => fetchFirebase<ExchangeCustomTokenPayloadType, ExchangeCustomTokenResponseType>({
        endpoint: "https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken",
        method: "POST",
        body: {
            returnSecureToken: true,
            token
        }
    }),
    refreshToken: (refreshToken: string) => fetchFirebase<RefreshTokenPayloadType, RefreshTokenResponseType>({
        endpoint: "https://securetoken.googleapis.com/v1/token",
        method: "POST",
        body: {
            grantType: "refresh_token",
            refreshToken: refreshToken
        }
    }),
    getAccountInfo: (idToken: string) => fetchFirebase<{ idToken: string }, GetAccountInfoResponseType>({
        endpoint: "https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo",
        method: "POST",
        body: { idToken }
    }),
    fetchLatestMoment: (token?: string, excludedUsers: string[] = []) => fetchLocket<MomentType>({
        endpoint: "getLatestMomentV2",
        method: "POST",
        body: {
            data: {
                last_fetch: 1,
                should_count_missed_moments: true,
                excluded_users: excludedUsers
            }
        },
        token: token
    }),
    fetchUser: (uid: string, token?: string) => fetchLocket<UserInfoType>({
        endpoint: "fetchUserV2",
        method: "POST",
        body: {
            data: {
                user_uid: uid
            }
        },
        token: token
    }),
    fetchFriends: (userId: string, token?: string, database = "(default)") => {
        const url = `https://firestore.googleapis.com/v1/projects/locket-4252a/databases/${database}/documents/users/${userId}/friends?pageSize=50`;
        return fetchFirebase<any, any>({
            endpoint: url,
            method: "GET",
            token,
            noKey: true
        });
    },
    fetchFollowers: (userId: string, token?: string, database = "(default)") => {
        const url = `https://firestore.googleapis.com/v1/projects/locket-4252a/databases/${database}/documents/users/${userId}/followers?pageSize=50`;
        return fetchFirebase<any, any>({
            endpoint: url,
            method: "GET",
            token,
            noKey: true
        });
    },
    fetchConversations: (userId: string, token?: string, database = "(default)") => {
        const url = `https://firestore.googleapis.com/v1/projects/locket-4252a/databases/${database}/documents/users/${userId}/conversations?pageSize=50&orderBy=last_updated%20desc`;
        return fetchFirebase<any, any>({
            endpoint: url,
            method: "GET",
            token,
            noKey: true
        });
    },
    fetchMessages: (userId: string, conversationId: string, token?: string, database = "(default)", isGlobal = false) => {
        const path = isGlobal 
            ? `conversations/${conversationId}/messages`
            : `users/${userId}/conversations/${conversationId}/messages`;
            
        const url = `https://firestore.googleapis.com/v1/projects/locket-4252a/databases/${database}/documents/${path}?pageSize=100`;
        
        return fetchFirebase<any, any>({
            endpoint: url,
            method: "GET",
            token,
            noKey: true
        });
    },
    createPost: async (thumbUrl: string, caption: string, token?: string) => {
        console.log("[API] createPost start", { thumbUrl, caption });
        const res = await fetchLocket<any>({
            endpoint: "postMomentV2",
            method: "POST",
            token: token,
            body: {
                data: !caption ? {
                    thumbnail_url: thumbUrl,
                    recipients: [],
                    overlays: []
                } : {
                    caption,
                    thumbnail_url: thumbUrl,
                    recipients: [],
                    overlays: [
                        {
                            overlay_id: "caption:standard",
                            overlay_type: "caption",
                            data: {
                                text_color: "#FFFFFFE6",
                                text: caption,
                                type: "standard",
                                max_lines: 4,
                                background: {
                                    colors: [],
                                    material_blur: "ultra-thin"
                                }
                            },
                            alt_text: caption
                        }
                    ]
                }
            }
        });
        console.log("[API] createPost response:", JSON.stringify(res, null, 2));
        return res;
    },
    createVideoPost: async (videoUrl: string, thumbUrl: string, caption: string, token?: string) => {
        console.log("[API] createVideoPost start", { videoUrl, thumbUrl, caption });
        const res = await fetchLocket<any>({
            endpoint: "postMomentV2",
            method: "POST",
            token: token,
            body: {
                data: !caption ? {
                    video_url: videoUrl,
                    thumbnail_url: thumbUrl,
                    recipients: [],
                    overlays: []
                } : {
                    caption,
                    video_url: videoUrl,
                    thumbnail_url: thumbUrl,
                    recipients: [],
                    overlays: [
                        {
                            overlay_id: "caption:standard",
                            overlay_type: "caption",
                            data: {
                                text_color: "#FFFFFFE6",
                                text: caption,
                                type: "standard",
                                max_lines: 4,
                                background: {
                                    colors: [],
                                    material_blur: "ultra-thin"
                                }
                            },
                            alt_text: caption
                        }
                    ]
                }
            }
        });
        console.log("[API] createVideoPost response:", JSON.stringify(res, null, 2));
        return res;
    },
    reactToMoment: (momentUid: string, reaction: string, token?: string) => fetchLocket<any>({
        endpoint: "reactToMoment",
        method: "POST",
        token: token,
        body: {
            data: {
                reaction: reaction,
                moment_uid: momentUid,
                intensity: {
                    "@type": "type.googleapis.com/google.protobuf.Int64Value",
                    value: "0"
                }
            }
        }
    }),
    setClientData: (token: string) => fetchLocket<any>({
        endpoint: "setClientData",
        method: "POST",
        token,
        body: {
            data: {
                app_version: "1.82.0",
                device_model: "iPhone12,1",
                os_version: "18.0"
            }
        }
    }),
    setNotificationToken: (token: string) => fetchLocket<any>({
        endpoint: "setNotificationToken",
        method: "POST",
        token,
        body: {
            data: {
                token: "dummy_token"
            }
        }
    }),
    sendChatMessage: (receiverUid: string, msg: string, momentUid: string | null = null, token?: string) => fetchLocket<any>({
        endpoint: "sendChatMessageV2",
        method: "POST",
        token,
        body: {
            data: {
                receiver_uid: receiverUid,
                client_token: "72652F96-0C4D-4CFE-9D59-B3251029B897".replace(/[0-9A-F]/g, () => (Math.random() * 16 | 0).toString(16).toUpperCase()), 
                msg,
                moment_uid: momentUid,
                from_memory: false
            }
        }
    }),
    markAsRead: (conversationId: string, _timestamp?: any, token?: string) => fetchLocket<any>({
        endpoint: "markAsRead",
        method: "POST",
        token,
        body: {
            data: {
                conversation_uid: conversationId
            }
        }
    }),
    markAsDelivered: (conversationId: string, _timestamp?: any, token?: string) => fetchLocket<any>({
        endpoint: "markAsDelivered",
        method: "POST",
        token,
        body: {
            data: {
                conversation_uid: conversationId
            }
        }
    }),
    deleteMoment: (momentUid: string, ownerUid: string, token?: string) => fetchLocket<any>({
        endpoint: "deleteMomentV2",
        method: "POST",
        token,
        body: {
            data: {
                analytics: {
                    platform: "ios",
                    experiments: {},
                    amplitude: {
                        device_id: "6D0D0A26-0C1A-4F60-912D-43D78DAE210A",
                        session_id: { value: Date.now().toString(), "@type": "type.googleapis.com/google.protobuf.Int64Value" }
                    },
                    google_analytics: { app_instance_id: "96C713D93C8D4E92805E578FCF43DDB6" },
                    ios_version: "2.34.0.4"
                },
                delete_globally: true,
                moment_uid: momentUid,
                owner_uid: ownerUid
            }
        }
    }),
    fetchFriendMomentsV2: async (userId: string, friendUid: string, token: string, lastDate?: string) => {
        const url = `https://firestore.googleapis.com/v1/projects/locket-4252a/databases/locket/documents/history/${userId}/entries:runQuery`;
        const body: any = {
            structuredQuery: {
                from: [{ collectionId: "entries" }],
                where: {
                    fieldFilter: {
                        field: { fieldPath: "user" },
                        op: "EQUAL",
                        value: { stringValue: friendUid }
                    }
                },
                orderBy: [
                    {
                        field: { fieldPath: "date" },
                        direction: "DESCENDING"
                    }
                ],
                limit: 30
            }
        };

        if (lastDate) {
            body.structuredQuery.where = {
                compositeFilter: {
                    op: "AND",
                    filters: [
                        {
                            fieldFilter: {
                                field: { fieldPath: "user" },
                                op: "EQUAL",
                                value: { stringValue: friendUid }
                            }
                        },
                        {
                            fieldFilter: {
                                field: { fieldPath: "date" },
                                op: "LESS_THAN",
                                value: { timestampValue: lastDate }
                            }
                        }
                    ]
                }
            };
        }

        const res = await fetchFirebase<any, any[]>({
            endpoint: url,
            method: "POST",
            token,
            body,
            noKey: true
        });
        return res.map((r: any) => r.document).filter(Boolean);
    }
}
