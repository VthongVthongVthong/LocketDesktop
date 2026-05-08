import cls from "./Avatar.module.scss";
import { getInitials } from "../utils/string";
import clsx from "clsx";

interface AvatarProps {
    src?: string;
    name?: string;
    className?: string;
    size?: string | number;
}

export default function Avatar({ src, name, className, size }: AvatarProps) {
    const style = size ? { width: size, height: size, minWidth: size, minHeight: size, fontSize: typeof size === 'number' ? size / 2.2 : `calc(${size} / 2.2)` } : {};
    
    if (src) {
        return (
            <img 
                src={src} 
                alt={name} 
                className={clsx(cls.Avatar, className)} 
                style={style}
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style');
                }}
            />
        );
    }

    return (
        <div className={clsx(cls.Avatar, cls.Placeholder, className)} style={style}>
            {getInitials(name || "")}
        </div>
    );
}
