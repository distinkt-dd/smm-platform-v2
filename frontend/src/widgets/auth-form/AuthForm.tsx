import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { Link } from "react-router";
import {
    clearAuthFeedback,
    loginThunk,
    registerThunk,
} from "../../entities/auth";
import { useAppDispatch, useAppSelector } from "../../shared/store";
import { Button, Input } from "../../shared/ui";

type Field = "email" | "password";

export const AuthForm = ({ mode }: { mode: "login" | "register" }) => {
    const [values, setValues] = useState({ email: "", password: "" });
    const dispatch = useAppDispatch();
    const request = useAppSelector((state) => state.auth.requests[mode]);
    const sessionExpired = useAppSelector((state) => state.auth.sessionExpired);
    const isLogin = mode === "login";
    const pending = request.status === "pending";
    const errors =
        request.error?.kind === "validation" ? request.error.fields : {};
    const formError =
        request.error?.kind === "validation"
            ? errors[""] || ""
            : request.error?.kind === "unknown"
              ? "Не удалось выполнить запрос. Попробуйте позже."
              : isLogin &&
                  request.error?.kind === "http" &&
                  request.error.status === 401
                ? "Неверная почта или пароль."
                : request.error?.message || "";
    const notice =
        request.status === "fulfilled"
            ? isLogin
                ? "Вход выполнен."
                : "Аккаунт создан. Теперь можно войти."
            : "";

    useEffect(() => {
        dispatch(clearAuthFeedback({ operation: mode }));
    }, [dispatch, mode]);

    const updateField = (field: Field, value: string) => {
        setValues((previous) => ({ ...previous, [field]: value }));
        dispatch(clearAuthFeedback({ operation: mode, field }));
    };

    const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (pending) return;
        if (isLogin) void dispatch(loginThunk(values));
        else void dispatch(registerThunk(values));
    };

    return (
        <form
            className="flex flex-col gap-6"
            onSubmit={handleSubmit}
            noValidate
            aria-invalid={formError ? true : undefined}
        >
            {isLogin && sessionExpired && (
                <p role="status" className="text-caption text-ink-muted">
                    Сессия недействительна или истекла. Войдите снова.
                </p>
            )}
            <Input
                label="Электронная почта"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="anna@example.ru"
                required
                disabled={pending}
                value={values.email}
                onChange={(event) => updateField("email", event.target.value)}
                error={errors.email}
            />
            <Input
                label="Пароль"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder={isLogin ? "Введите пароль" : "От 8 до 32 символов"}
                required
                disabled={pending}
                value={values.password}
                onChange={(event) =>
                    updateField("password", event.target.value)
                }
                error={errors.password}
            />
            <Button type="submit" className="w-full" disabled={pending}>
                {pending
                    ? "Подождите..."
                    : isLogin
                      ? "Войти"
                      : "Создать аккаунт"}
            </Button>
            {notice && (
                <p role="status" className="text-caption text-ink-muted">
                    {notice}
                </p>
            )}
            <p className="text-center text-caption text-ink-muted">
                {isLogin ? "Впервые здесь? " : "Уже есть аккаунт? "}
                <Link
                    className="font-semibold text-link hover:underline"
                    to={isLogin ? "/register" : "/login"}
                >
                    {isLogin ? "Зарегистрироваться" : "Войти"}
                </Link>
            </p>
            {formError && (
                <p
                    role="alert"
                    className="text-caption text-link whitespace-pre-line"
                >
                    {formError}
                </p>
            )}
        </form>
    );
};
