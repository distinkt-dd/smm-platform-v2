import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link } from "react-router";
import { credentialsSchema, login, register } from "../../entities/auth";
import { ApiHttpError, ApiNetworkError } from "../../shared/api/api";
import { validate } from "../../shared/lib/validate";
import { Button, Input } from "../../shared/ui";

type Field = "email" | "password";

export const AuthForm = ({ mode }: { mode: "login" | "register" }) => {
    const [values, setValues] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
    const [formError, setFormError] = useState("");
    const [notice, setNotice] = useState("");
    const [pending, setPending] = useState(false);
    const isLogin = mode === "login";

    const updateField = (field: Field, value: string) => {
        setValues((previous) => ({ ...previous, [field]: value }));
        setErrors((previous) => ({ ...previous, [field]: undefined }));
        setFormError("");
        setNotice("");
    };

    const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (pending) return;
        setErrors({});
        setFormError("");
        setNotice("");
        const validation = validate(credentialsSchema, values);
        if (!validation.success) {
            setErrors(validation.errors);
            if (validation.errors[""]) setFormError(validation.errors[""]);
            return;
        }
        setPending(true);
        try {
            if (isLogin) {
                await login(validation.data);
                setNotice(
                    "Вход выполнен. Сохранение сессии пока не подключено.",
                );
            } else {
                await register(validation.data);
                setNotice("Аккаунт создан. Теперь можно войти.");
            }
        } catch (error) {
            if (
                error instanceof ApiHttpError ||
                error instanceof ApiNetworkError
            ) {
                setFormError(error.message);
            } else {
                setFormError("Не удалось выполнить запрос. Попробуйте позже.");
            }
        } finally {
            setPending(false);
        }
    };

    return (
        <form
            className="flex flex-col gap-6"
            onSubmit={handleSubmit}
            noValidate
            aria-invalid={formError ? true : undefined}
        >
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
