import cls from "./Main.module.scss"
import { useEffect, useRef, useState } from "react";
import { SavedMomentType } from "../types/moments";
import { timeSinceOf } from "../utils/string";
import { MdOutlineAddReaction, MdVideocam } from "react-icons/md";
import { BsFillPlayFill, BsPauseFill } from "react-icons/bs";
import clsx from "clsx";
import { IoMdArrowRoundUp } from "react-icons/io";
import { useMainContext } from "../MainContext";
import { FiMenu } from "react-icons/fi";
import { GrAppsRounded, GrGroup } from "react-icons/gr";
import { HiLogout, HiOutlineDownload, HiOutlineUpload, HiOutlineTrash } from "react-icons/hi";
import { VscClose } from "react-icons/vsc";
import { IoPaperPlaneOutline, IoChevronDown, IoChatbubbleOutline, IoNotificationsOutline, IoNotificationsOffOutline } from "react-icons/io5";
import { Menu, MenuItem, SubMenu } from "@szhsin/react-menu";

import { AiOutlineClear } from "react-icons/ai";
import { IoMdHeartEmpty } from "react-icons/io";
import { addMomentLocally, clearMoments, deleteMoment, fetchLatestMoment } from "../lib/momentService";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
import { uploadImageAndPost, uploadVideoAndPost } from "../lib/uploadService";
import Spinner from "../components/Spinner";
import Avatar from "../components/Avatar";
import { API } from "../services/api";
import { logout } from "../lib/momentService";
import { MdLogout, MdClose } from "react-icons/md";
import { ALL_EMOJIS } from "../constants/emojis";

const menuItemClassName = ({ hover }: { hover: boolean }) =>
    clsx(cls.MenuItem, hover && cls.hover);



function TimeCount({ date }: { date: number }) {
    const [time, setTime] = useState(timeSinceOf(date));

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(timeSinceOf(date));
        }, 1000);
        return () => clearInterval(interval);
    }, [date]);

    return <span className={cls.Time}>{time}</span>;
}

function VideoPlayer({ src }: { src: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [paused, setPaused] = useState(false);

    const toggle = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) { v.play(); setPaused(false); }
        else { v.pause(); setPaused(true); }
    };

    return (
        <div className={cls.VideoWrap} onClick={toggle}>
            <video
                ref={videoRef}
                className={cls.Video}
                src={src}
                autoPlay
                loop
                muted
                playsInline
            />
            <div className={clsx(cls.PlayOverlay, paused && cls.visible)}>
                {paused ? <BsFillPlayFill /> : <BsPauseFill />}
            </div>
        </div>
    );
}

function MomentItem({ moment, onDeleteClick }: { moment: SavedMomentType; onDeleteClick: (m: SavedMomentType) => void }) {
    const { userData } = useMainContext();
    return (
        <div className={cls.Main}>
            <div className={cls.MomentContent}>
                <div className={cls.ImageContainer}>
                    <div
                        className={cls.Image}
                        style={{ "--moment-img": `url(${moment.thumbnail_url})` } as React.CSSProperties}
                    >
                        {moment.video_url && <VideoPlayer src={moment.video_url} />}
                        {moment.video_url && (
                            <div className={cls.VideoBadge}>
                                <MdVideocam /> video
                            </div>
                        )}
                        {moment.caption?.length > 0 && (
                            <div className={cls.Caption}>{moment.caption}</div>
                        )}
                    </div>
                </div>
                <div className={cls.UserInfo}>
                    <Avatar src={moment.user.avatar} name={moment.user.username} className={cls.Avatar} size={34} />
                    <span className={cls.Name}>{moment.user.username}</span>
                    <TimeCount date={moment.seconds || 0} />
                    {moment.user.uid === userData?.localId && (
                        <div
                            className={cls.UserDeleteBtn}
                            onClick={(e) => { e.stopPropagation(); onDeleteClick(moment); }}
                        >
                            <HiOutlineTrash />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function MainScreen() {
    const {
        moments, userData,
        friends, setFriends,
        selectedFriendUid, setSelectedFriendUid,
        setFriendMoments,
        targetMomentUid, setTargetMomentUid,
        inItem, setInItem,
        setSection
    } = useMainContext();
    const [showNewItemBtn, setShowNewItemBtn] = useState(false);
    const prevLengthRef = useRef(moments.length);

    useEffect(() => {
        // We rely on Popup.tsx (the context provider) to handle the global moment subscription.
        // This ensures a single source of truth for the moments state.
    }, []);

    useEffect(() => {
        if (moments.length > prevLengthRef.current) {
            setInItem(p => {
                if (p > 0) { setShowNewItemBtn(true); return p + 1; }
                return 0;
            });
        }
        prevLengthRef.current = moments.length;
    }, [moments.length, setInItem]);

    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [momentToDelete, setMomentToDelete] = useState<SavedMomentType | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [fileBuffer, setFileBuffer] = useState<Blob | null>(null);
    const [caption, setCaption] = useState("");
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    // Cropping State
    const [imageToCrop, setImageToCrop] = useState<HTMLImageElement | null>(null);
    const [cropPosition, setCropPosition] = useState({ x: 50, y: 50 }); // percentage
    const [isDraggingCrop, setIsDraggingCrop] = useState(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [fallingEmojis, setFallingEmojis] = useState<{ id: number, emoji: string, left: number, delay: number, duration: number }[]>([]);
    const [messageInput, setMessageInput] = useState("");
    const [showLogout, setShowLogout] = useState(false);
    const [showFriends, setShowFriends] = useState(false);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [, setLoadingFriendMoments] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const lastCaptureTimeRef = useRef(0);

    useEffect(() => {
        import("../lib/store").then(m => m.storeGet<boolean>('notifications_enabled')).then(val => {
            if (val !== null) setNotificationsEnabled(val);
        });
    }, []);

    const toggleNotifications = async () => {
        const newVal = !notificationsEnabled;
        setNotificationsEnabled(newVal);
        const { storeSet } = await import("../lib/store");
        await storeSet('notifications_enabled', newVal);
    };

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingProgress, setRecordingProgress] = useState(0);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<any>(null);
    const longPressTimerRef = useRef<any>(null);

    const logoutRef = useRef<HTMLDivElement>(null);
    const friendsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
                setShowLogout(false);
            }
            if (friendsRef.current && !friendsRef.current.contains(event.target as Node)) {
                setShowFriends(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        setMessageInput("");
        setShowLogout(false);
        setShowFriends(false);
        setShowEmojiPicker(false);
    }, [inItem]);

    const filteredMoments = selectedFriendUid
        ? moments.filter(m => m.user.uid === selectedFriendUid)
        : moments;

    useEffect(() => {
        if (targetMomentUid && filteredMoments.length > 0) {
            console.log("[Main] targetMomentUid changed:", targetMomentUid);
            console.log("[Main] Current filteredMoments IDs:", filteredMoments.map(m => m.moment_uid));

            // Give it a tiny delay to ensure render is ready
            const timer = setTimeout(() => {
                const index = filteredMoments.findIndex(m => m.moment_uid === targetMomentUid);
                console.log("[Main] Found index:", index);
                if (index !== -1) {
                    setInItem(index + 1);
                    setTargetMomentUid(null);
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [targetMomentUid, filteredMoments, setInItem, setTargetMomentUid]);

    useEffect(() => {
        if (selectedFriendUid) {
            setLoadingFriendMoments(true);
            import("../lib/momentService").then(async m => {
                const fMoments = await m.fetchFriendMoments(selectedFriendUid);
                setFriendMoments(fMoments);
                if (fMoments.length > 0) setInItem(1);
                else setInItem(0);
                setLoadingFriendMoments(false);
            });
        } else {
            setFriendMoments([]);
        }
    }, [selectedFriendUid]);

    useEffect(() => {
        if (friends.length === 0 && userData?.localId) {
            setLoadingFriends(true);
            import("../lib/store").then(m => m.storeGet("token")).then(token => {
                if (token) {
                    API.fetchFriends(userData.localId, token as string).then(async (resp) => {
                        const docs = resp.documents || [];
                        const friendList: any[] = [];
                        const toFetch = docs.slice(0, 20);
                        for (const doc of toFetch) {
                            const uid = doc.fields?.user?.stringValue;
                            if (uid) {
                                try {
                                    const user = await API.fetchUser(uid, token as string);
                                    if (user?.data) friendList.push(user.data);
                                } catch (e) { console.error("Fetch friend error", e); }
                            }
                        }
                        setFriends(friendList);
                        import("../lib/store").then(m => m.storeSet('friends_cache', friendList));
                        setLoadingFriends(false);
                    }).catch(() => setLoadingFriends(false));
                } else setLoadingFriends(false);
            });
        }
    }, [userData?.localId, friends.length]);

    useEffect(() => {
        if (inItem === 0 && !capturedImage && !videoPreviewUrl) {
            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    width: { ideal: 1024 },
                    height: { ideal: 1024 },
                    aspectRatio: { exact: 1 }
                },
                audio: false
            })
                .then(stream => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => console.error("Camera error:", err));
        } else {
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(t => t.stop());
            }
        }
    }, [inItem, capturedImage, videoPreviewUrl]);

    // Video Recording Logic
    const startRecording = () => {
        if (!videoRef.current?.srcObject) return;
        const stream = videoRef.current.srcObject as MediaStream;

        // Use a high-quality video format
        let mimeType = 'video/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm;codecs=vp9';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
            setVideoBlob(blob);
            const url = URL.createObjectURL(blob);
            setVideoPreviewUrl(url);
            setIsRecording(false);
            setRecordingProgress(0);

            // Generate thumbnail from video
            const thumb = await generateThumbnail(url);
            if (thumb) setFileBuffer(thumb);
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingProgress(0);

        const startTime = Date.now();
        const duration = 10000; // 10 seconds

        recordingIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / duration) * 100, 100);
            setRecordingProgress(progress);
            if (elapsed >= duration) stopRecording();
        }, 100);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
    };

    const generateThumbnail = (videoUrl: string): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const video = document.createElement("video");
            video.src = videoUrl;
            video.muted = true;
            video.playsInline = true;

            video.onloadedmetadata = () => {
                video.currentTime = 0.5; // Capture a frame at 0.5s
            };

            video.onseeked = () => {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(b => resolve(b), "image/webp", 0.9);
                } else resolve(null);
            };

            video.onerror = (e) => {
                console.error("Video thumbnail error", e);
                resolve(null);
            };

            // Timeout after 5 seconds
            setTimeout(() => resolve(null), 5000);
        });
    };

    const handleMouseDown = () => {
        if (inItem !== 0) {
            setInItem(0);
            return;
        }
        if (capturedImage || videoPreviewUrl) return;
        longPressTimerRef.current = setTimeout(() => {
            startRecording();
            longPressTimerRef.current = null;
        }, 500);
    };

    const handleMouseUp = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
            handleCapture(); // Simple photo capture if short press
        } else if (isRecording) {
            stopRecording();
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    setImageToCrop(img);
                    setCapturedImage(img.src);
                    setCropPosition({ x: 50, y: 50 });
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith("video/")) {
            setVideoBlob(file);
            const url = URL.createObjectURL(file);
            setVideoPreviewUrl(url);
            const thumb = await generateThumbnail(url);
            if (thumb) setFileBuffer(thumb);
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleCropMouseDown = (e: React.MouseEvent) => {
        if (!imageToCrop) return;
        setIsDraggingCrop(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleCropMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingCrop || !imageToCrop) return;
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        setCropPosition(prev => ({
            x: Math.max(0, Math.min(100, prev.x - (dx / 3))), // sensitivity factor
            y: Math.max(0, Math.min(100, prev.y - (dy / 3)))
        }));
    };

    const handleCropMouseUp = () => {
        setIsDraggingCrop(false);
    };

    const finalizeCrop = (): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (!imageToCrop) return resolve(null);
            const canvas = document.createElement("canvas");
            const size = 1024;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(null);

            const img = imageToCrop;
            const imgAspect = img.width / img.height;
            let drawW, drawH, drawX, drawY;

            if (imgAspect > 1) { // Landscape
                drawH = size;
                drawW = size * imgAspect;
                drawY = 0;
                drawX = -(drawW - size) * (cropPosition.x / 100);
            } else { // Portrait
                drawW = size;
                drawH = size / imgAspect;
                drawX = 0;
                drawY = -(drawH - size) * (cropPosition.y / 100);
            }

            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            canvas.toBlob(blob => resolve(blob), "image/webp", 0.9);
        });
    };

    const handleCapture = () => {
        if (inItem !== 0) {
            setInItem(0);
            return;
        }
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        const size = Math.min(video.videoWidth, video.videoHeight, 1024);
        const scale = size / Math.min(video.videoWidth, video.videoHeight);

        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);

        const offsetX = (size - video.videoWidth * scale) / 2;
        const offsetY = (size - video.videoHeight * scale) / 2;

        ctx.drawImage(video, offsetX, offsetY, video.videoWidth * scale, video.videoHeight * scale);

        const dataUrl = canvas.toDataURL("image/webp");
        setCapturedImage(dataUrl);
        canvas.toBlob(b => setFileBuffer(b), "image/webp", 0.9);
        lastCaptureTimeRef.current = Date.now();
    };

    const handlePost = async () => {
        // Prevent click-through from capture button
        if (Date.now() - lastCaptureTimeRef.current < 500) {
            console.log("[Main] Blocking handlePost due to recent capture (click-through protection)");
            return;
        }

        let finalBuffer = fileBuffer;
        if (imageToCrop) {
            finalBuffer = await finalizeCrop();
        }

        if (!finalBuffer && capturedImage) {
            // Fallback: convert dataURL back to blob if toBlob hasn't finished
            const resp = await fetch(capturedImage);
            finalBuffer = await resp.blob();
        }

        if (!finalBuffer) {
            alert("Không có ảnh/video thumbnail để upload. Vui lòng thử lại.");
            return;
        }

        if (uploading) return;
        setUploading(true);
        try {
            let newMoment;
            if (videoBlob) {
                console.log("Posting video...", videoBlob.type, videoBlob.size);
                newMoment = await uploadVideoAndPost(videoBlob, finalBuffer, caption);
            } else {
                newMoment = await uploadImageAndPost(finalBuffer, caption);
            }
            if (newMoment) {
                await addMomentLocally(newMoment);
            }
            handleCancel();
            // Still poll to sync with server's final state
            setTimeout(() => {
                fetchLatestMoment();
            }, 3000);
            setInItem(1);
        } catch (e: any) {
            console.error(e);
            alert("Lỗi khi đăng bài: " + (e.message || e));
        }
        setUploading(false);
    };

    const handleCancel = () => {
        setCapturedImage(null);
        setVideoPreviewUrl(null);
        setVideoBlob(null);
        setFileBuffer(null);
        setCaption("");
        setImageToCrop(null);
        setCropPosition({ x: 50, y: 50 });
    };

    const handleReact = async (emoji: string) => {
        if (inItem < 1 || inItem > filteredMoments.length) return;
        const currentMoment = filteredMoments[inItem - 1];

        const newEmojis = Array.from({ length: 6 }).map(() => ({
            id: Date.now() + Math.random(),
            emoji: emoji,
            left: 20 + Math.random() * 60,
            delay: Math.random() * 0.3,
            duration: 1.5 + Math.random() * 1
        }));
        setFallingEmojis(prev => [...prev, ...newEmojis]);
        setTimeout(() => setFallingEmojis(prev => prev.filter(e => !newEmojis.includes(e))), 3000);
        setShowEmojiPicker(false);

        if (!currentMoment.moment_uid) return;
        try { await API.reactToMoment(currentMoment.moment_uid, emoji); } catch (e) { console.error("Failed to react", e); }
    };

    const downloadCurrentMoment = async () => {
        if (inItem < 1 || inItem > filteredMoments.length) return;
        const moment = filteredMoments[inItem - 1];
        if (!moment) return;

        const isVideo = !!moment.video_url;
        const url = isVideo ? moment.video_url! : moment.thumbnail_url;
        const ext = isVideo ? 'mp4' : 'webp';

        try {
            const savePath = await save({
                filters: [{ name: isVideo ? 'Video (MP4)' : 'Image (WebP)', extensions: [ext] }],
                defaultPath: `moment_${Date.now()}.${ext}`,
            });
            if (!savePath) return;
            const response = await fetch(url, { method: 'GET' });
            const buffer = await response.arrayBuffer();
            await writeFile(savePath, new Uint8Array(buffer));
        } catch (e) { console.error("Download failed", e); }
    };

    const handleSendMessage = async () => {
        if (inItem < 1 || inItem > filteredMoments.length) return;
        const currentMoment = filteredMoments[inItem - 1];
        if (!messageInput.trim()) return;
        const msg = messageInput.trim();
        setMessageInput("");
        try {
            await API.sendChatMessage(currentMoment.user.uid || currentMoment.user.username, msg, currentMoment.moment_uid || null);
        } catch (e) { console.error("Failed to send message", e); }
    };

    const handleChangeTile = (add: boolean) => {
        setInItem(p => {
            if (add) return p + 1 > filteredMoments.length ? filteredMoments.length : p + 1;
            return p - 1 < 0 ? 0 : p - 1;
        });
    };

    const lastScrollRef = useRef(0);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") handleChangeTile(e.key === "ArrowDown");
        };
        const onWheel = (e: WheelEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest(`.${cls.EmojiGrid}`) || target.closest(`.${cls.FriendsList}`) || target.closest(`.${cls.Menu}`)) return;
            const now = Date.now();
            if (now - lastScrollRef.current < 600) return;
            if (Math.abs(e.deltaY) < 10) return;
            lastScrollRef.current = now;
            handleChangeTile(e.deltaY > 0);
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("wheel", onWheel);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("wheel", onWheel);
        };
    }, [filteredMoments.length]);


    return (
        <div className={cls.MainScreen} data-tauri-drag-region>
            <div className={cls.TopBar} data-tauri-drag-region>
                <div ref={logoutRef} className={cls.LeftAvatar} onClick={() => setShowLogout(!showLogout)}>
                    <Avatar src={userData?.photoUrl} name={userData?.displayName || userData?.email || "User"} size={36} />
                    {showLogout && (
                        <div className={cls.LogoutDropdown} onClick={(e) => e.stopPropagation()}>
                            <div className={cls.DropdownItem} onClick={() => logout()}>
                                <MdLogout />
                                <span>Đăng xuất</span>
                            </div>
                        </div>
                    )}
                </div>
                <div ref={friendsRef} className={cls.CenterDropdown} onClick={() => setShowFriends(!showFriends)}>
                    {selectedFriendUid ? (selectedFriendUid === userData?.localId ? "Bạn" : friends.find(f => f.uid === selectedFriendUid)?.first_name || "Bạn bè") : "Mọi người"} <IoChevronDown />
                    {showFriends && (
                        <div className={cls.FriendsDropdown} onClick={(e) => e.stopPropagation()}>
                            <div className={cls.FriendsHeader}>
                                <div className={cls.FriendsTitle}>Bộ lọc</div>
                            </div>
                            <div className={cls.FriendsList}>
                                {loadingFriends && <div className={cls.LoadingFriends}><Spinner /></div>}

                                {/* Mọi người */}
                                <div className={clsx(cls.FriendItem, !selectedFriendUid && cls.ActiveFriend)} onClick={() => {
                                    setSelectedFriendUid(null);
                                    setShowFriends(false);
                                    setInItem(0);
                                }}>
                                    <div className={cls.FriendIcon}><GrGroup /></div>
                                    <div className={cls.FriendInfo}>
                                        <div className={cls.FriendName}>Mọi người</div>
                                    </div>
                                </div>

                                {/* Bạn */}
                                <div className={clsx(cls.FriendItem, selectedFriendUid === userData?.localId && cls.ActiveFriend)} onClick={() => {
                                    setSelectedFriendUid(userData?.localId || null);
                                    setShowFriends(false);
                                    setInItem(0);
                                }}>
                                    <Avatar src={userData?.photoUrl} name="Bạn" size={40} />
                                    <div className={cls.FriendInfo}>
                                        <div className={cls.FriendName}>Bạn</div>
                                    </div>
                                </div>

                                {friends.map((f, i) => (
                                    <div key={i} className={clsx(cls.FriendItem, selectedFriendUid === f.uid && cls.ActiveFriend)} onClick={() => {
                                        setSelectedFriendUid(selectedFriendUid === f.uid ? null : f.uid);
                                        setShowFriends(false);
                                        setInItem(0);
                                    }}>
                                        <Avatar src={f.profile_picture_url} name={`${f.first_name} ${f.last_name}`} size={40} />
                                        <div className={cls.FriendInfo}>
                                            <div className={cls.FriendName}>{f.first_name} {f.last_name}</div>
                                            <div className={cls.FriendUsername}>@{f.username}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className={cls.RightActions}>
                    <div className={cls.ActionIcon} onClick={() => setSection(4)}><IoChatbubbleOutline /></div>
                    <Menu
                        menuClassName={cls.Menu}
                        align="end"
                        menuButton={<div className={cls.ActionIcon}><FiMenu /></div>}
                        transition
                    >
                        <SubMenu label={
                            <>
                                <Avatar src={userData?.photoUrl} name={userData?.displayName || userData?.email} className={cls.MenuAvatar} size={38} />
                                <span className={cls.MenuName}>{userData?.displayName || userData?.email}</span>
                            </>
                        } menuClassName={cls.Menu} className={cls.AccountMenu}>
                            <MenuItem onClick={async () => { await clearMoments(); }} className={menuItemClassName}>
                                <AiOutlineClear /> Clear gallery
                            </MenuItem>
                            <MenuItem onClick={() => logout()} className={menuItemClassName}>
                                <HiLogout /> Log out
                            </MenuItem>
                        </SubMenu>
                        <MenuItem onClick={() => setSection(2)} className={menuItemClassName}>
                            <IoMdHeartEmpty /> About Locket Desktop
                        </MenuItem>
                        <MenuItem onClick={toggleNotifications} className={menuItemClassName}>
                            {notificationsEnabled ? <IoNotificationsOutline /> : <IoNotificationsOffOutline />}
                            {notificationsEnabled ? "Tắt thông báo" : "Bật thông báo"}
                        </MenuItem>
                    </Menu>
                </div>
            </div>

            <div className={cls.Moment} data-tauri-drag-region>
                <button
                    onClick={() => { setInItem(1); setShowNewItemBtn(false); }}
                    className={clsx("btn", cls.NewBtn, showNewItemBtn && cls.ShowBtn)}
                >
                    new moment <span><IoMdArrowRoundUp /></span>
                </button>
                <div
                    className={cls.LsMoment}
                    style={{ transform: `translateY(-${inItem * 100}%)` }}
                >
                    <div className={cls.Main}>
                        <div className={cls.MomentContent}>
                            <div className={cls.ImageContainer}>
                                <div
                                    className={cls.Image}
                                    style={capturedImage ? {
                                        backgroundImage: `url(${capturedImage})`,
                                        backgroundPosition: imageToCrop ? `${cropPosition.x}% ${cropPosition.y}%` : "center",
                                        cursor: imageToCrop ? (isDraggingCrop ? "grabbing" : "grab") : "default"
                                    } : {}}
                                    onMouseDown={handleCropMouseDown}
                                    onMouseMove={handleCropMouseMove}
                                    onMouseUp={handleCropMouseUp}
                                    onMouseLeave={handleCropMouseUp}
                                >
                                    {!capturedImage && !videoPreviewUrl && <video ref={videoRef} autoPlay playsInline muted className={cls.Video} style={{ transform: "scaleX(-1)", position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "40px" }} />}
                                    {videoPreviewUrl && <video src={videoPreviewUrl} autoPlay loop playsInline className={cls.Video} style={{ transform: "scaleX(-1)", position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "40px" }} />}

                                    {(capturedImage || videoPreviewUrl) && (
                                        <input
                                            className={cls.CaptionOverlayInput}
                                            placeholder="Nhập tin nhắn..."
                                            value={caption}
                                            onChange={e => setCaption(e.target.value)}
                                            onMouseDown={e => e.stopPropagation()} // Prevent drag when typing
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {filteredMoments.map((moment, index) => (
                        <MomentItem key={index} moment={moment} onDeleteClick={(m) => setMomentToDelete(m)} />
                    ))}
                </div>
            </div>

            {!capturedImage && !videoPreviewUrl ? (
                <div className={clsx(cls.BottomNav, inItem !== 0 && cls.Shrunk)} data-tauri-drag-region>
                    <div className={cls.NavIcon} onClick={() => setSection(1)}><GrAppsRounded /></div>
                    <div
                        className={clsx(cls.CameraBtn, isRecording && cls.IsRecording)}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {isRecording && (
                            <svg className={cls.ButtonRecordingRing} viewBox="0 0 100 100">
                                <circle
                                    cx="50" cy="50" r="46"
                                    className={cls.ProgressCircle}
                                    strokeDasharray="289"
                                    strokeDashoffset={289 - (recordingProgress / 100) * 289}
                                />
                            </svg>
                        )}
                    </div>
                    <div
                        className={cls.NavIcon}
                        onClick={() => inItem !== 0 ? downloadCurrentMoment() : fileInputRef.current?.click()}
                    >
                        {inItem !== 0 ? <HiOutlineDownload /> : <HiOutlineUpload />}
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                    />
                </div>
            ) : (
                <div className={cls.PostNav}>
                    <div className={cls.CancelBtn} onClick={handleCancel}><VscClose /></div>
                    <div className={cls.SendBtn} onClick={handlePost}>
                        {uploading ? <Spinner /> : <IoPaperPlaneOutline />}
                    </div>
                    <div className={cls.ToolBtn}><HiOutlineUpload /></div>
                </div>
            )}

            {inItem !== 0 && (
                <div className={cls.BottomBar} data-tauri-drag-region>
                    <div className={cls.InputWrapper}>
                        <input
                            className={cls.MessageInput}
                            placeholder="Gửi tin nhắn..."
                            value={messageInput}
                            onChange={e => setMessageInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        />
                        <div className={cls.InputActions}>
                            {messageInput.length > 0 ? (
                                <div className={cls.SendMsgBtn} onClick={handleSendMessage}><IoPaperPlaneOutline /></div>
                            ) : (
                                <div className={cls.QuickEmojis}>
                                    <span onClick={() => handleReact("🤣")}>🤣</span>
                                    <span onClick={() => handleReact("💛")}>💛</span>
                                    <span onClick={() => handleReact("💩")}>💩</span>
                                    <div className={cls.AddEmoji} onClick={() => setShowEmojiPicker(!showEmojiPicker)}><MdOutlineAddReaction /></div>
                                </div>
                            )}
                        </div>
                        {showEmojiPicker && (
                            <div className={cls.EmojiPicker}>
                                <div className={cls.PickerHeader}>
                                    <span>Chọn cảm xúc</span>
                                    <div className={cls.ClosePicker} onClick={() => setShowEmojiPicker(false)}><MdClose /></div>
                                </div>
                                <div className={cls.EmojiGrid}>
                                    {ALL_EMOJIS.map(em => <span key={em} onClick={() => handleReact(em)}>{em}</span>)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={cls.FooterText}>© Locket Desktop</div>
            {fallingEmojis.map(item => (
                <div key={item.id} className={cls.FallingEmoji} style={{ left: `${item.left}%`, animationDelay: `${item.delay}s`, animationDuration: `${item.duration}s` }}>
                    {item.emoji}
                </div>
            ))}
            {momentToDelete && (
                <div className={cls.ModalOverlay} onClick={() => setMomentToDelete(null)}>
                    <div className={cls.DeleteModal} onClick={e => e.stopPropagation()}>
                        <h3>Xóa khoảnh khắc?</h3>
                        <p>Hành động này không thể hoàn tác.</p>
                        <div className={cls.ModalActions}>
                            <button className={cls.CancelBtn} onClick={() => setMomentToDelete(null)}>Hủy</button>
                            <button className={cls.ConfirmBtn} disabled={isDeleting} onClick={async () => {
                                if (isDeleting) return;
                                setIsDeleting(true);
                                try {
                                    const success = await deleteMoment(momentToDelete.md5 || momentToDelete.moment_uid || "", momentToDelete.user.uid);
                                    if (success) {
                                        setInItem(0);
                                        setMomentToDelete(null);
                                    }
                                } finally {
                                    setIsDeleting(false);
                                }
                            }}>
                                {isDeleting ? "Đang xóa..." : "Xóa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
