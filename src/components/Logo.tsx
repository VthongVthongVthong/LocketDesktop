// thanks to https://react-svgr.com/playground
import { SVGProps } from "react"

const LocketLogo = (props: SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 40 40"
        width="1em"
        height="1em"
        {...props}
    >
        <rect
            width={40}
            height={40}
            rx={8}
            ry={8}
            style={{
                strokeWidth: 0,
                fill: "#f2a900",
            }}
        />
        <path
            d="M20 31.5l-1.5-1.4C12.2 24.8 8.3 21.2 8.3 16.7c0-3.6 2.9-6.5 6.5-6.5 2.1 0 4 1 5.2 2.5 1.2-1.5 3.1-2.5 5.2-2.5 3.6 0 6.5 2.9 6.5 6.5 0 4.5-3.9 8.1-10.2 14.4l-1.5 1.4z"
            style={{
                fill: "#a36b00",
                strokeWidth: 0,
            }}
        />
    </svg>
)
export default LocketLogo
