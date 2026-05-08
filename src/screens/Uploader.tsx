import clsx from 'clsx';
import clsMain from './Main.module.scss';
import cls from './Uploader.module.scss';
import { MdOutlineImage } from 'react-icons/md';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VscClose } from 'react-icons/vsc';
import Spinner from '../components/Spinner';
import { uploadImageAndPost } from '../lib/uploadService';

export default function UploaderScreen() {
    const [file, setFile] = useState<null | File>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState("");
    const [fileBuffer, setFileBuffer] = useState<Blob | null>(null);
    const [loading, setLoading] = useState(false);
    const [editCaption, setEditCaption] = useState(false);
    const [caption, setCaption] = useState("");

    const handleCancel = () => {
        setFile(null);
        setFileBuffer(null);
        setEditCaption(false);
        setCaption("");
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    }

    const handleUploadImage = useCallback(async () => {
        if (!fileBuffer) return;
        setLoading(true);

        try {
            await uploadImageAndPost(fileBuffer, caption);
            setError("Done!");
            setLoading(false);
            handleCancel();
        } catch (e: any) {
            setError(`[Error] ${e?.message ?? JSON.stringify(e)}`);
            setLoading(false);
        }
    }, [caption, fileBuffer]);

    const previewUrl = useMemo(() => {
        if (fileBuffer) {
            return URL.createObjectURL(fileBuffer);
        }
        return "";
    }, [fileBuffer]);

    useEffect(() => {
        if (!file) return;

        const img = new Image();
        const reader = new FileReader();

        reader.onload = () => img.src = reader.result as string;
        reader.readAsDataURL(file);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxSize = 1020;
            const size = Math.min(img.width, img.height, maxSize);
            const scale = size / Math.min(img.width, img.height);

            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                setError('Error converting image to WebP [CANVAS_NULLED]');
                setLoading(false);
                handleCancel();
                return;
            }

            const offsetX = (size - img.width * scale) / 2;
            const offsetY = (size - img.height * scale) / 2;

            ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        setFileBuffer(blob);
                    } else {
                        setError('Error converting image to WebP');
                        handleCancel();
                    }
                    setLoading(false);
                },
                'image/webp',
                0.9
            );
        };
    }, [file]);

    return (
        <>
            <div className={clsx(clsMain.MainScreen, cls.Uploader)}>
                <div className={clsx("Error", !!error && "showErr")}>
                    <span>{error}</span>
                    <div className={"Close"} onClick={() => setError("")}>
                        <VscClose />
                    </div>
                </div>
                <div className={clsMain.Moment}>
                    <div className={clsMain.LsMoment}>
                        <div className={clsMain.Main}>
                            <div className={clsMain.MomentContent}>
                                <div className={clsMain.ImageContainer}>
                                    <div className={clsMain.Image} style={{ "--moment-img": `url(${previewUrl})` } as React.CSSProperties}>
                                        <input
                                            ref={inputRef}
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    if (e.target.files[0].size > 4 * 1024 * 1024) {
                                                        setError("Image size exceeded limit");
                                                        handleCancel();
                                                        return;
                                                    }
                                                    if (e.target.files[0].type !== "image/jpeg" && e.target.files[0].type !== "image/png") {
                                                        setError("Unsupported file");
                                                        handleCancel();
                                                        return;
                                                    }
                                                    setLoading(true);
                                                    setFile(e.target.files[0]);
                                                }
                                            }}
                                            className={cls.UploadInput} type="file" accept=".jpeg,.jpg,.png" />
                                        {previewUrl.length > 0 ? <div
                                            onClick={() => !loading && setEditCaption(true)}
                                            className={clsMain.Caption}>
                                            {editCaption ? <input
                                                onBlur={() => {
                                                    setEditCaption(false);
                                                }}
                                                className={cls.editCaption}
                                                value={caption}
                                                onChange={(e) => setCaption(e.target.value)}
                                            /> : caption.length > 0 ? caption : "click to add caption"}
                                        </div> : <div className={cls.UploaderOverlay}>
                                            <div className={cls.Icon}>
                                                <MdOutlineImage />
                                            </div>
                                            <h2>drag and drop or click to choose image</h2>
                                            <p>supports jpeg/png below 4MB</p>
                                        </div>}
                                    </div>
                                </div>
                                <div className={clsMain.UserInfo}>
                                    <button disabled={loading || !file} onClick={() => handleUploadImage()} className={clsx("btn", "btn-soft", cls.UploadBtn)}>
                                        {loading ? <Spinner /> : "upload"}
                                    </button>
                                    <button disabled={loading || !file} className={cls.CloseBtn} onClick={handleCancel}>
                                        <VscClose />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
