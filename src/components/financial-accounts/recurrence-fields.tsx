"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import { useState } from "react"
import type { RepeatInput, EditScope } from "@/lib/recurrence-input"
import { nextSlot } from "@/lib/recurrence-input"
import { Input } from "@/components/ui/input"
import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldError,
} from "@/components/ui/field"
export type RecurrenceEditing = RepeatInput & {
    ruleId: string
    ruleVersion: number
    scheduledFor: string
    totalCount?: number
    futureCount?: number
}
const selectClass =
    "h-9 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
export function RecurrenceFields({
    initial,
    date,
    error,
    scopeError,
    onScopeChange,
}: {
    initial?: RecurrenceEditing | null
    date: string
    error?: string
    scopeError?: string
    onScopeChange: (scope: EditScope) => void
}) {
    const t = useTranslations()

    const [enabled, setEnabled] = useState(Boolean(initial)),
        [scope, setScope] = useState<EditScope>("ONLY")
    const [frequency, setFrequency] = useState<RepeatInput["frequency"]>(
            initial?.frequency ?? "MONTHLY"
        ),
        [interval, setInterval] = useState(String(initial?.interval ?? 1)),
        [end, setEnd] = useState(
            initial?.endsOn ? "date" : initial?.endAfter ? "count" : "never"
        )
    const [timezone, setTimezone] = useState(initial?.timezone ?? "UTC"),
        [endsOn, setEndsOn] = useState(initial?.endsOn ?? ""),
        [endAfter, setEndAfter] = useState(String(initial?.endAfter ?? 12))
    const locked = Boolean(initial && scope === "ONLY")
    let next: string | null = null
    if (
        !initial &&
        Number.isInteger(Number(interval)) &&
        Number(interval) >= 1 &&
        Number(interval) <= 120
    )
        next = nextSlot(
            date,
            {
                frequency,
                interval: Number(interval),
                timezone,
                occurrenceStatus: "PENDING",
                endsOn: end === "date" ? endsOn : null,
                endAfter: end === "count" ? Number(endAfter) : null,
            },
            1
        )
    return (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
            {initial && (
                <>
                    <input
                        type="hidden"
                        name="expectedRuleVersion"
                        value={initial.ruleVersion}
                    />
                    <Field>
                        <FieldLabel htmlFor="edit-scope">
                            {t("Apply changes to")}
                        </FieldLabel>
                        <select
                            id="edit-scope"
                            name="editScope"
                            value={scope}
                            className={selectClass}
                            onChange={(event) => {
                                const value = event.target.value as EditScope
                                setScope(value)
                                onScopeChange(value)
                            }}
                        >
                            <option value="ONLY">
                                {t("Only this occurrence")}
                            </option>
                            <option value="FUTURE">
                                {t("This and future occurrences")}
                            </option>
                            <option value="ALL">
                                {t("All occurrences, including past")}
                            </option>
                        </select>
                        <FieldDescription>
                            {t(
                                "This and future uses the original scheduled date"
                            )}{" "}
                            {initial.scheduledFor}
                            {t(
                                ". Series edits preserve each occurrence’s date. Shared details overwrite previous individual edits. Deleted and skipped occurrences stay excluded."
                            )}
                        </FieldDescription>
                    </Field>
                    {scope !== "ONLY" && (
                        <Field>
                            <FieldLabel htmlFor="series-confirm">
                                <input
                                    id="series-confirm"
                                    type="checkbox"
                                    name="seriesConfirmed"
                                    value="yes"
                                    required
                                    className="mr-2"
                                />
                                {t("I understand this updates")}{" "}
                                {scope === "ALL"
                                    ? t(
                                          "{value0} existing occurrences, including past payments",
                                          {
                                              value0:
                                                  initial.totalCount ??
                                                  t("all"),
                                          }
                                      )
                                    : t(
                                          "{value0} existing occurrences from this date onward",
                                          {
                                              value0:
                                                  initial.futureCount ??
                                                  t("the matching"),
                                          }
                                      )}
                                {t(", plus future payments.")}
                            </FieldLabel>
                            <FieldDescription>
                                {scope === "ALL"
                                    ? t(
                                          "Changing amounts, wallets, or Posted/Pending status can change historical balances and reports."
                                      )
                                    : t(
                                          "Changing Posted/Pending status or amounts can change your balance."
                                      )}
                            </FieldDescription>
                        </Field>
                    )}
                    {scopeError && (
                        <FieldError role="alert">{scopeError}</FieldError>
                    )}
                </>
            )}
            <Field>
                <FieldLabel htmlFor="repeat-enabled">
                    <input
                        id="repeat-enabled"
                        name="repeatEnabled"
                        type="checkbox"
                        checked={enabled}
                        disabled={Boolean(initial)}
                        onChange={(event) => {
                            setEnabled(event.target.checked)
                            if (!initial)
                                setTimezone(
                                    Intl.DateTimeFormat().resolvedOptions()
                                        .timeZone || "UTC"
                                )
                        }}
                        className="mr-2"
                    />
                    {t("Repeat")}
                </FieldLabel>
                <FieldDescription>
                    {initial
                        ? t(
                              "Manage pause, skip, or stop from Recurring transactions. Select a series scope above to edit its schedule."
                          )
                        : t(
                              "Create future payments now as Pending. The original transaction uses the date and status you select."
                          )}
                </FieldDescription>
            </Field>
            {enabled && (
                <fieldset disabled={locked} className="flex flex-col gap-4">
                    {initial && scope !== "ONLY" && (
                        <input type="hidden" name="repeatEnabled" value="on" />
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                            <FieldLabel htmlFor="repeat-frequency">
                                {t("Frequency")}
                            </FieldLabel>
                            <select
                                id="repeat-frequency"
                                name="repeatFrequency"
                                value={frequency}
                                onChange={(event) =>
                                    setFrequency(
                                        event.target
                                            .value as RepeatInput["frequency"]
                                    )
                                }
                                className={selectClass}
                            >
                                <option value="DAILY">{t("Daily")}</option>
                                <option value="WEEKLY">{t("Weekly")}</option>
                                <option value="MONTHLY">{t("Monthly")}</option>
                                <option value="YEARLY">{t("Yearly")}</option>
                            </select>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="repeat-interval">
                                {t("Every how many periods?")}
                            </FieldLabel>
                            <Input
                                id="repeat-interval"
                                name="repeatInterval"
                                type="number"
                                min={1}
                                max={120}
                                step={1}
                                required
                                value={interval}
                                onChange={(event) =>
                                    setInterval(event.target.value)
                                }
                            />
                        </Field>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {t(
                            "Additional occurrences are created upfront as Pending. They never post automatically. Fixed schedules create all copies; open-ended schedules keep the next 12 months ready."
                        )}
                    </p>
                    <Field>
                        <FieldLabel htmlFor="repeat-timezone">
                            {t("Schedule timezone")}
                        </FieldLabel>
                        <Input
                            id="repeat-timezone"
                            name="repeatTimezone"
                            value={timezone}
                            maxLength={100}
                            required
                            onChange={(event) =>
                                setTimezone(event.target.value)
                            }
                        />
                        <FieldDescription>
                            {t(
                                "Calendar dates are checked in this timezone. Payments have no time of day."
                            )}
                        </FieldDescription>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="repeat-end">{t("End")}</FieldLabel>
                        <select
                            id="repeat-end"
                            name="repeatEnd"
                            value={end}
                            onChange={(event) => setEnd(event.target.value)}
                            className={selectClass}
                        >
                            <option value="never">{t("Never")}</option>
                            <option value="date">{t("On a date")}</option>
                            <option value="count">
                                {t("After a number of occurrences")}
                            </option>
                        </select>
                    </Field>
                    {end === "date" && (
                        <Field>
                            <FieldLabel htmlFor="repeat-ends-on">
                                {t("Last eligible date (inclusive)")}
                            </FieldLabel>
                            <Input
                                id="repeat-ends-on"
                                name="repeatEndsOn"
                                type="date"
                                value={endsOn}
                                required
                                min={initial ? undefined : date}
                                onChange={(event) =>
                                    setEndsOn(event.target.value)
                                }
                            />
                        </Field>
                    )}
                    {end === "count" && (
                        <Field>
                            <FieldLabel htmlFor="repeat-end-after">
                                {t("Total scheduled occurrences")}
                            </FieldLabel>
                            <Input
                                id="repeat-end-after"
                                name="repeatEndAfter"
                                type="number"
                                min={1}
                                max={10000}
                                step={1}
                                value={endAfter}
                                required
                                onChange={(event) =>
                                    setEndAfter(event.target.value)
                                }
                            />
                            <FieldDescription>
                                {t(
                                    "Includes the first payment and skipped dates."
                                )}
                            </FieldDescription>
                        </Field>
                    )}
                    <p className="text-sm text-muted-foreground">
                        {initial
                            ? t(
                                  "Schedule changes apply only to ungenerated dates, anchored to the series’ original start date."
                              )
                            : next
                              ? t("Next pending copy: {value0}.", {
                                    value0: next,
                                })
                              : t("No further payments with this ending.")}{" "}
                        {t(
                            "Month-end and leap-day schedules clamp to the last valid day without drifting."
                        )}
                    </p>
                </fieldset>
            )}
            {error && <FieldError role="alert">{t(error || "")}</FieldError>}
        </div>
    )
}
