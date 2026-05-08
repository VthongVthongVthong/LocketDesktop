import MainScreen from "./Main";
import cls from "./Global.module.scss";
import clsx from "clsx";
import { useMainContext } from "../MainContext";
import SavedMoment from "./SavedMoments";
import { IoChevronBack } from "react-icons/io5";
import AboutScreen from "./About";
import UploaderScreen from "./Uploader";
import ChatScreen from "./Chat";



export default function GlobalScreen() {
    const mainCtx = useMainContext();
    const { section, setSection, setInItem } = mainCtx;


    return (
        <div className={cls.Global} data-section={section}>
            {section !== 0 && section !== 4 && (
                <div onClick={() => setSection(0)} className={clsx(cls.MenuBtn, cls.BackBtn)}>
                    <IoChevronBack />
                </div>
            )}
            <div className={cls.Section} data-section="0">
                {section === 0 && (
                    <MainScreen />
                )}
            </div>
            <div className={cls.Section} data-section="1">
                <SavedMoment setInItem={(i: number) => {
                    setInItem(i);
                    setSection(0);
                }} />
            </div>
            <div className={cls.Section} data-section="2">
                <AboutScreen />
            </div>
            <div className={cls.Section} data-section="3">
                <UploaderScreen />
            </div>
            <div className={cls.Section} data-section="4">
                <ChatScreen onBack={() => setSection(0)} />
            </div>
        </div>
    )
}
