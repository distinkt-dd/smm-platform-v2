import { afterEach, describe, expect, it, vi } from "vitest";
import { saveProfile } from "../src/entities/profile/api/profile-api";

const profile = {
    id: "profile-1",
    displayName: "Анна",
    specialization: "Стилист",
    about: null,
    confirmedFacts: [],
    services: [],
};

const request = {
    displayName: "Анна",
    specialization: "Стилист",
    about: "Делаю аккуратный макияж",
};

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe("profile API", () => {
    it("отправляет пустое описание, чтобы очистить его", async () => {
        vi.stubEnv("VITE_API_URL", "http://localhost:3000");
        const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(profile));
        vi.stubGlobal("fetch", fetchMock);

        await saveProfile({ ...request, displayName: " Анна ", about: "   " });

        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe("http://localhost:3000/me/profile");
        expect(options.method).toBe("PUT");
        // `about` есть в теле всегда: backend очищает описание пустой строкой,
        // а отсутствие поля оставило бы прежнее значение.
        expect(JSON.parse(options.body)).toEqual({
            displayName: "Анна",
            specialization: "Стилист",
            about: "",
        });
    });

    it("раскладывает известные сообщения 400 по полям формы", async () => {
        vi.stubEnv("VITE_API_URL", "http://localhost:3000");
        const fetchMock = vi.fn().mockResolvedValueOnce(
            Response.json(
                {
                    statusCode: 400,
                    message: [
                        "О себе не должно быть меньше 10 символов!",
                        "Неизвестное правило",
                    ],
                },
                { status: 400 },
            ),
        );
        vi.stubGlobal("fetch", fetchMock);

        // Сравнение текстов не зависит от завершающего знака: `class-validator`
        // добавляет `!`, а локальная схема — нет.
        await expect(saveProfile(request)).rejects.toMatchObject({
            name: "ValidationError",
            errors: {
                about: "О себе не должно быть меньше 10 символов!",
                "": "Неизвестное правило",
            },
        });
    });

    it("оставляет нераспознанный 400 HTTP-ошибкой с общим сообщением", async () => {
        vi.stubEnv("VITE_API_URL", "http://localhost:3000");
        const fetchMock = vi.fn().mockResolvedValueOnce(
            Response.json({ message: ["Что-то пошло не так"] }, { status: 400 }),
        );
        vi.stubGlobal("fetch", fetchMock);

        await expect(saveProfile(request)).rejects.toMatchObject({
            name: "ApiHttpError",
            status: 400,
            messages: ["Что-то пошло не так"],
        });
    });

    it("проверяет данные локально и не отправляет запрос", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            saveProfile({ ...request, displayName: "Ан" }),
        ).rejects.toMatchObject({
            name: "ValidationError",
            errors: { displayName: "Имя пользователя не должно быть меньше 3 символов" },
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
