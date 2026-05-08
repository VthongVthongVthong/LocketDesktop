import { useCallback, useState } from "react";
import LocketLogo from "../components/Logo";
import cls from "./Login.module.scss";
import clsx from "clsx";
import { validateEmail } from "../utils/string";
import Spinner from "../components/Spinner";
import { API, GenericError, ResponseError } from "../services/api";
import { useMainContext } from "../MainContext";
import { VscClose } from "react-icons/vsc";
import { UserType } from "../types/user";
import PhoneNumberInput from "../components/PhoneNumber";
import { storeSet } from "../lib/store";

export default function LoginScreen() {
    const mainCtx = useMainContext();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showWarn, setShowWarn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [otpLogin, setOtpLogin] = useState(false);
    const [pNInput, setPNInput] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [phoneNumberValid, setPhoneNumberValid] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [sentOtp, setSentOtp] = useState(false);

    const handleSendOtp = useCallback(async () => {
        setError("");
        setLoading(true);

        try {
            const res = await API.requestOTP(phoneNumber);

            if (res) {
                setSentOtp(true);
                setLoading(false);
                return;
            }
            setError("Không thể gửi mã OTP!");
            setLoading(false);
        } catch (e: any) {
            const error = e as ResponseError<GenericError>;
            setLoading(false);
            setError(
                error.error.message === 'INVALID_PHONE_NUMBER' ? "Số điện thoại không hợp lệ" :
                    "Không thể gửi mã OTP: (" + error.error.message + ")");
        }
    }, [phoneNumber]);

    const handleLogin = useCallback(async () => {
        setError("");
        setShowWarn(false);
        setLoading(true);

        if (otpLogin) {
            try {
                const res = await API.verifyOTP(phoneNumber, otpCode);

                if (res.token) {
                    const exchange = await API.exchangeOTPTokenForIDToken(res.token);
                    const user = await API.getAccountInfo(exchange.idToken);

                    if (!user.users[0]) {
                        setError("Đã có lỗi xảy ra, vui lòng thử lại");
                        setLoading(false);
                        return;
                    }

                    await storeSet('token', exchange.idToken);
                    await storeSet('refreshToken', exchange.refreshToken);
                    await storeSet('user', user.users[0] as UserType);
                    await mainCtx.handleLogin(user.users[0] as UserType);
                    return;
                }

                setError("Không thể đăng nhập!");
                setLoading(false);
            } catch (e: any) {
                const error = e as ResponseError<GenericError>;
                setLoading(false);
                setError(
                    error.error.message === 'INVALID_CODE' ? "Mã OTP không hợp lệ" :
                        "Đã xảy ra lỗi: (" + error.error.message + ")");
            }
            return;
        }

        try {
            const res = await API.login(email, password);

            if (res) {
                const user = await API.getAccountInfo(res.idToken);

                if (!user.users[0]) {
                    setError("Đã có lỗi xảy ra, vui lòng thử lại");
                    setLoading(false);
                    return;
                }

                await storeSet('token', res.idToken);
                await storeSet('refreshToken', res.refreshToken);
                await storeSet('user', user.users[0] as UserType);
                await mainCtx.handleLogin(user.users[0] as UserType);
                return;
            }
            setError("Không thể đăng nhập!");
            setLoading(false);
        } catch (e: any) {
            const error = e as ResponseError<GenericError>;
            setLoading(false);
            setError(
                error.error.message === 'INVALID_PASSWORD' ?
                    'Mật khẩu không đúng' : error.error.message === "EMAIL_NOT_FOUND" ? "Không tìm thấy email, vui lòng kiểm tra lại" :
                        error.error.message === "INVALID_EMAIL" ? "Email không hợp lệ" :
                            error.error.message === "USER_DISABLED" ? "Tài khoản đã bị vô hiệu hóa" :
                                "Đã xảy ra lỗi: (" + error.error.message + ")");
        }
    }, [otpLogin, phoneNumber, otpCode, mainCtx, email, password]);

    return (
        <div className={clsx(cls.Section, showWarn && cls.s1)} data-tauri-drag-region>
            <div className={clsx("Error", !!error && "showErr")}>
                <span>{error}</span>
                <div className={"Close"} onClick={() => setError("")}>
                    <VscClose />
                </div>
            </div>
            <div className={clsx(cls.LoginWarn)} data-tauri-drag-region>
                <div className={cls.Content}>
                    <h1>Trước khi bạn tiếp tục...</h1>
                    <p>Dự án này không liên quan đến Locket hoặc Locket Labs, Inc dưới bất kỳ hình thức nào. Bằng cách sử dụng ứng dụng này, bạn xác nhận rằng đây là một ứng dụng Locket không chính thức và bạn chấp nhận rủi ro tài khoản có thể bị khóa.
                        <br />
                        Nếu bạn không chắc chắn hoặc không hiểu rõ những gì mình đang làm, vui lòng không sử dụng ứng dụng này.
                        <br />
                        Người tạo ra ứng dụng sẽ không chịu trách nhiệm cho bất kỳ hậu quả nào.</p>
                    <button
                        onClick={handleLogin}
                        className={clsx("btn")}>
                        Tiếp tục
                    </button>
                    <button
                        className={clsx("btn btn-soft")}
                        onClick={() => setShowWarn(false)}
                    >
                        Quay lại
                    </button>
                </div>
            </div>
            <div className={cls.Login} data-tauri-drag-region>
                <div className={cls.Intro} data-tauri-drag-region>
                    <div className={cls.Logo}>
                        <LocketLogo />
                    </div>
                    <div className={cls.Title}>
                        <h1>Locket Desktop</h1>
                        <p>
                            Vui lòng đăng nhập vào tài khoản Locket của bạn.
                        </p>
                    </div>
                </div>
                <div className={cls.Form} data-otp-step={otpLogin ? sentOtp ? '2' : '1' : '0'}>
                    {otpLogin ? <>
                        <PhoneNumberInput
                            value={pNInput}
                            onValueChange={(v) => setPNInput(v)}
                            onE164ValueChange={(v) => setPhoneNumber(v)}
                            onSuccessChange={(v) => setPhoneNumberValid(v)}
                            className={clsx("input", cls.Input)}
                        />
                        {sentOtp &&
                            <input
                                style={{ marginTop: '0.5rem' }}
                                className={clsx("input", cls.Input)}
                                disabled={loading}
                                type="text"
                                name="otp"
                                placeholder="mã otp"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                            />
                        }
                    </> : <>
                        <input
                            className={clsx("input", cls.Input)}
                            disabled={loading}
                            type="text"
                            name="email"
                            placeholder="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            className={clsx("input", cls.Input)}
                            disabled={loading}
                            type="password"
                            placeholder="mật khẩu"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </>
                    }
                    {(otpLogin && !sentOtp) ? <button
                        disabled={loading || !phoneNumber || !phoneNumberValid}
                        className={clsx(cls.Button, "btn")}
                        onClick={() => handleSendOtp()}
                    >
                        {loading ?
                            <div className={cls.Loading}>
                                <Spinner data-size="3" />
                            </div>
                            : !phoneNumberValid ? "số điện thoại không hợp lệ" : "gửi mã otp"}
                    </button> :
                        <button
                            disabled={
                                otpLogin ? !otpCode || otpCode.length < 6 || otpCode.length > 6 || !phoneNumber || !phoneNumberValid || loading :
                                    !email || !password || !validateEmail(email) || loading
                            }
                            className={clsx(cls.Button, "btn")}
                            onClick={() => setShowWarn(true)}
                        >
                            {loading ?
                                <div className={cls.Loading}>
                                    <Spinner data-size="3" />
                                </div>
                                : "Đăng nhập"}
                        </button>
                    }
                    <a className={cls.anotherMethod} onClick={() => { setOtpLogin(!otpLogin); setPhoneNumber(""); setPNInput(""); setOtpCode(""); }}>
                        {otpLogin ? "Đăng nhập bằng email và mật khẩu" : <span style={{ color: "#F2A900" }}>Đăng nhập bằng số điện thoại</span>}
                    </a>
                </div>

                <p className={cls.forkMe}>
                    Được tạo bởi <a target="_blank" href="https://github.com/vthongvthongvthong">Vthong</a> - <a target="_blank" href="https://github.com/vthongvthongvthong/LocketDesktop">mã nguồn trên github</a>
                </p>
            </div>
        </div>
    )
}
