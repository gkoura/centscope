"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import { useId, type Ref } from "react"
import { Switch } from "@/components/ui/switch"
import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldError,
} from "@/components/ui/field"

export function StatusSwitch({
    value,
    onValueChange,
    name,
    label = "Status",
    description,
    error,
    disabled = false,
    saving = false,
    controlRef,
    accessibleLabel,
    compact = false,
}: {
    compact?: boolean
    value: string
    onValueChange: (value: "POSTED" | "PENDING") => void
    name?: string
    label?: string
    description?: string
    error?: string
    disabled?: boolean
    saving?: boolean
    controlRef?: Ref<HTMLButtonElement>
    accessibleLabel?: string
}) {
    const t = useTranslations()

    const id = useId(),
        posted = value === "POSTED"
    const describedBy =
        [
            description || saving ? `${id}-description` : "",
            error ? `${id}-error` : "",
        ]
            .filter(Boolean)
            .join(" ") || undefined
    return (
        <Field
            className={compact ? "w-auto gap-0" : undefined}
            data-invalid={Boolean(error)}
            data-disabled={disabled || saving}
        >
            <FieldLabel
                htmlFor={id}
                className={compact ? "sr-only" : undefined}
            >
                {t(label || "")}
            </FieldLabel>
            {name && <input type="hidden" name={name} value={value} />}
            <div className="flex min-h-11 items-center gap-3">
                {!compact && (
                    <span
                        aria-hidden="true"
                        className={
                            posted
                                ? "text-sm text-muted-foreground"
                                : "text-sm font-medium"
                        }
                    >
                        {t("Pending")}
                    </span>
                )}
                <Switch
                    ref={controlRef}
                    id={id}
                    size="lg"
                    title={
                        compact
                            ? t("{value0} · switch to {value1}", {
                                  value0: posted ? t("Posted") : t("Pending"),
                                  value1: posted ? t("Pending") : t("Posted"),
                              })
                            : undefined
                    }
                    checked={posted}
                    onCheckedChange={(checked) =>
                        onValueChange(checked ? "POSTED" : "PENDING")
                    }
                    disabled={disabled || saving}
                    aria-label={t(accessibleLabel ?? label)}
                    aria-describedby={describedBy}
                    aria-invalid={Boolean(error)}
                />
                {!compact && (
                    <span
                        aria-hidden="true"
                        className={
                            posted
                                ? "text-sm font-medium"
                                : "text-sm text-muted-foreground"
                        }
                    >
                        {t("Posted")}
                    </span>
                )}
            </div>
            {(description || saving) && (
                <FieldDescription
                    id={`${id}-description`}
                    aria-live="polite"
                    className={compact ? "sr-only" : undefined}
                >
                    {saving ? t("Saving status…") : description}
                </FieldDescription>
            )}
            {error && (
                <FieldError id={`${id}-error`} role="alert">
                    {t(error || "")}
                </FieldError>
            )}
        </Field>
    )
}
