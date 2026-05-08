import clsx from "clsx"
import cls from "./Spinner.module.scss"

export default function Spinner({ className, ...spinnerProps }: {
    className?: string
    spinnerProps?: React.HTMLAttributes<HTMLSpanElement>
}) {
    return (
        <span {...spinnerProps} className={clsx(cls.rtSpinner, className)}>
            <span className={cls.rtSpinnerLeaf} />
            <span className={cls.rtSpinnerLeaf} />
            <span className={cls.rtSpinnerLeaf} />
            <span className={cls.rtSpinnerLeaf} />
            <span className={cls.rtSpinnerLeaf} />
            <span className={cls.rtSpinnerLeaf} />
            <span className={cls.rtSpinnerLeaf} />
            <span className={cls.rtSpinnerLeaf} />
        </span>
    )
}