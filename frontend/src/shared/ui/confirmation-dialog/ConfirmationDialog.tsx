import { useEffect, useId, useRef } from "react";
import { Button } from "../button";

type Props = {
    title: string;
    description: string;
    confirmLabel: string;
    pending?: boolean;
    error?: string;
    onConfirm: () => void;
    onCancel: () => void;
};

export function ConfirmationDialog({
    title,
    description,
    confirmLabel,
    pending = false,
    error,
    onConfirm,
    onCancel,
}: Props) {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const descriptionId = useId();
    useEffect(() => {
        const dialog = ref.current;
        const previous =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        dialog?.showModal();
        return () => {
            dialog?.close();
            if (previous?.isConnected) previous.focus();
        };
    }, []);
    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            onCancel={(event) => {
                event.preventDefault();
                if (!pending) onCancel();
            }}
            className="m-auto w-[calc(100%-2rem)] max-w-preview rounded-panel bg-surface p-6 text-ink shadow-raised backdrop:bg-ink/50"
        >
            <div className="flex flex-col gap-4">
                <h2 id={titleId}>{title}</h2>
                <p id={descriptionId} className="text-ink-muted">
                    {description}
                </p>
                {error && (
                    <p
                        role="alert"
                        className="text-caption text-link whitespace-pre-line"
                    >
                        {error}
                    </p>
                )}
                <div className="flex flex-col-reverse gap-3 phone:flex-row phone:justify-end">
                    <button
                        type="button"
                        autoFocus
                        disabled={pending}
                        onClick={onCancel}
                        className="min-h-12 rounded-control border border-line px-5 font-semibold disabled:opacity-50"
                    >
                        Отмена
                    </button>
                    <Button disabled={pending} onClick={onConfirm}>
                        {pending ? "Выполняем…" : confirmLabel}
                    </Button>
                </div>
            </div>
        </dialog>
    );
}
