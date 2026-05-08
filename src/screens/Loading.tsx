import Spinner from "../components/Spinner";

export default function LoadingScreen() {
    return (
        <div className="loadingScreen">
            <Spinner data-size="3" />
        </div>
    )
}