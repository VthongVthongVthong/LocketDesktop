export interface MomentType {
    data: Datum[];
    missed_moments_count: number;
    sync_token: string;
    status: number;
}

export interface Datum {
    canonical_uid: string;
    user: string;
    thumbnail_url: string;
    video_url?: string;
    date: DateClass;
    caption: string;
    overlays: Overlay[];
    md5: string;
}

export interface DateClass {
    _seconds: number;
    _nanoseconds: number;
}

export interface Overlay {
    data: Data;
    overlay_id: string;
    alt_text: string;
    overlay_type: string;
}

export interface Data {
    text: string;
    text_color: string;
    type: string;
    max_lines: number;
    background: Background;
}

export interface Background {
    colors: any[];
    material_blur: string;
}


export interface SavedMomentType {
    user: {
        username: string;
        avatar: string;
        uid: string;
    };
    md5: string;
    thumbnail_url: string;
    video_url?: string;
    seconds: number;
    caption: string;
    moment_uid?: string;
}