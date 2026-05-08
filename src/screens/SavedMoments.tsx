import { useEffect, useRef, useState } from "react";
import cls from "./SavedSection.module.scss";
import mainCls from "./Main.module.scss";
import { useMainContext } from "../MainContext";
import { fetchMoreMoments } from "../lib/momentService";
import { IoChevronDown } from "react-icons/io5";
import { GrGroup } from "react-icons/gr";

import Avatar from "../components/Avatar";
import clsx from "clsx";

export default function SavedMoment({ setInItem }: { setInItem: (i: number) => void }) {
    const { 
        moments, 
        friends, 
        selectedFriendUid, 
        setSelectedFriendUid, 
        friendMoments,
        loadMoreFriendMoments,
        userData
    } = useMainContext();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showFriends, setShowFriends] = useState(false);
    const friendsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (friendsRef.current && !friendsRef.current.contains(event.target as Node)) {
                setShowFriends(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onScroll = () => {
            if (el.scrollHeight - el.scrollTop <= el.clientHeight + 100) {
                if (selectedFriendUid) {
                    loadMoreFriendMoments();
                } else {
                    fetchMoreMoments();
                }
            }
        };

        el.addEventListener("scroll", onScroll);
        return () => el.removeEventListener("scroll", onScroll);
    }, [selectedFriendUid]);

    const displayedMoments = selectedFriendUid ? friendMoments : moments;

    return (
        <div className={cls.GalleryContainer}>
            <div className={cls.GalleryHeader}>
                <div ref={friendsRef} className={mainCls.CenterDropdown} onClick={() => setShowFriends(!showFriends)}>
                    {selectedFriendUid ? (selectedFriendUid === userData?.localId ? "Bạn" : friends.find(f => f.uid === selectedFriendUid)?.first_name || "Bạn bè") : "Mọi người"} <IoChevronDown />
                    {showFriends && (
                        <div className={mainCls.FriendsDropdown} onClick={(e) => e.stopPropagation()}>
                            <div className={mainCls.FriendsHeader}>
                                <div className={mainCls.FriendsTitle}>Bộ lọc</div>
                            </div>
                            <div className={mainCls.FriendsList}>
                                {/* Mọi người */}
                                <div className={clsx(mainCls.FriendItem, !selectedFriendUid && mainCls.ActiveFriend)} onClick={() => {
                                    setSelectedFriendUid(null);
                                    setShowFriends(false);
                                }}>
                                    <div className={mainCls.FriendIcon}><GrGroup /></div>
                                    <div className={mainCls.FriendInfo}>
                                        <div className={mainCls.FriendName}>Mọi người</div>
                                    </div>
                                </div>

                                {/* Bạn */}
                                <div className={clsx(mainCls.FriendItem, selectedFriendUid === userData?.localId && mainCls.ActiveFriend)} onClick={() => {
                                    setSelectedFriendUid(userData?.localId || null);
                                    setShowFriends(false);
                                }}>
                                    <Avatar src={userData?.photoUrl} name="Bạn" size={40} />
                                    <div className={mainCls.FriendInfo}>
                                        <div className={mainCls.FriendName}>Bạn</div>
                                    </div>
                                </div>

                                {friends.map((f, i) => (
                                    <div key={i} className={clsx(mainCls.FriendItem, selectedFriendUid === f.uid && mainCls.ActiveFriend)} onClick={() => {
                                        setSelectedFriendUid(selectedFriendUid === f.uid ? null : f.uid);
                                        setShowFriends(false);
                                    }}>
                                        <Avatar src={f.profile_picture_url} name={`${f.first_name} ${f.last_name}`} size={40} />
                                        <div className={mainCls.FriendInfo}>
                                            <div className={mainCls.FriendName}>{f.first_name} {f.last_name}</div>
                                            <div className={mainCls.FriendUsername}>@{f.username}</div>
                                        </div>
                                    </div>
                                ))}
                                {friends.length === 0 && <div className={mainCls.NoFriends}>Không tìm thấy bạn bè</div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className={cls.SavedMoment} ref={scrollRef}>
                {displayedMoments.map((moment, i) => (
                    <div key={i}
                        className={cls.Moment}
                        onClick={() => {
                            // Tìm index thật trong filteredMoments để MainScreen hiển thị đúng
                            setInItem(i + 1);
                        }}
                        style={{ backgroundImage: `url(${moment.thumbnail_url})` }}
                    ></div>
                ))}
                {displayedMoments.length === 0 && (
                    <div className={cls.EmptyGallery}>
                        Chưa có moment nào
                    </div>
                )}
            </div>
        </div>
    )
}
