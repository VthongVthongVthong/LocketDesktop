import { createContext, useContext } from "react";
import { SavedMomentType } from "./types/moments";
import { UserType } from "./types/user";

export const MainContext = createContext<{
    loggedIn: boolean;
    setLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    userData: UserType | null;
    setUserData: React.Dispatch<React.SetStateAction<UserType | null>>;
    moments: SavedMomentType[];
    setMoments: React.Dispatch<React.SetStateAction<SavedMomentType[]>>;
    handleLogin: (user: UserType) => Promise<void>;
    friends: any[];
    setFriends: React.Dispatch<React.SetStateAction<any[]>>;
    conversations: any[];
    setConversations: React.Dispatch<React.SetStateAction<any[]>>;
    selectedFriendUid: string | null;
    setSelectedFriendUid: React.Dispatch<React.SetStateAction<string | null>>;
    friendMoments: SavedMomentType[];
    setFriendMoments: React.Dispatch<React.SetStateAction<SavedMomentType[]>>;
    loadMoreFriendMoments: () => Promise<void>;
    section: number;
    setSection: React.Dispatch<React.SetStateAction<number>>;
    selectedConv: any | null;
    setSelectedConv: React.Dispatch<React.SetStateAction<any | null>>;
    targetMomentUid: string | null;
    setTargetMomentUid: React.Dispatch<React.SetStateAction<string | null>>;
    inItem: number;
    setInItem: React.Dispatch<React.SetStateAction<number>>;
}>({
    loggedIn: false,
    setLoggedIn: () => { },
    loading: true,
    setLoading: () => { },
    userData: null,
    setUserData: () => { },
    moments: [],
    setMoments: () => { },
    handleLogin: async () => { },
    friends: [],
    setFriends: () => { },
    conversations: [],
    setConversations: () => { },
    selectedFriendUid: null,
    setSelectedFriendUid: () => { },
    friendMoments: [],
    setFriendMoments: () => { },
    loadMoreFriendMoments: async () => { },
    section: 0,
    setSection: () => { },
    selectedConv: null,
    setSelectedConv: () => { },
    targetMomentUid: null,
    setTargetMomentUid: () => { },
    inItem: 0,
    setInItem: () => { },
});

export const useMainContext = () => {
    return useContext(MainContext);
}
