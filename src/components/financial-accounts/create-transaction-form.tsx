"use client"

import Link from "next/link"
import { RecurrenceFields, type RecurrenceEditing } from "./recurrence-fields"
import type { EditScope } from "@/lib/recurrence-input"
import { ExpenseSpreadFields } from "./expense-spread-fields"
import type { ExpenseSpread } from "@/lib/expense-spread"
import { useActionState, useState } from "react"
import {
    createTransaction,
    updateTransaction,
} from "@/app/dashboard/accounts/[id]/transactions/actions"
import {
    transactionTypes,
    type TransactionFormState,
} from "@/lib/transaction-input"
import { DatePicker } from "@/components/ui/date-picker"
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxGroup,
    ComboboxLabel,
} from "@/components/ui/combobox"
import type { TransactionSuggestion } from "@/lib/transaction-input"
import { StatusSwitch } from "./status-switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

function TransactionSelect({
    name,
    label,
    value,
    options,
    onChange,
    error,
    description,
}: {
    name: string
    label: string
    value: string
    options: readonly { value: string; label: string }[]
    onChange: (value: string) => void
    error?: string
    description?: string
}) {
    const id = `transaction-${name}`
    return (
        <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Select
                name={name}
                value={value || null}
                items={options}
                onValueChange={(next) => {
                    if (next) onChange(next)
                }}
            >
                <SelectTrigger
                    id={id}
                    data-flow={
                        name === "type"
                            ? value === "INCOME"
                                ? "income"
                                : "expense"
                            : undefined
                    }
                    className="w-full"
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                        [
                            description ? `${id}-description` : "",
                            error ? `${id}-error` : "",
                        ]
                            .filter(Boolean)
                            .join(" ") || undefined
                    }
                >
                    <SelectValue placeholder="Choose an option" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {options.map((option) => (
                            <SelectItem
                                key={option.value}
                                value={option.value}
                                data-flow={
                                    name === "type"
                                        ? option.value === "INCOME"
                                            ? "income"
                                            : "expense"
                                        : undefined
                                }
                            >
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
            {description ? (
                <FieldDescription id={`${id}-description`}>
                    {description}
                </FieldDescription>
            ) : null}
            {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
        </Field>
    )
}

type CategoryChoice = {
    id: string
    name: string
    type: "EXPENSE" | "INCOME"
    parentId: string | null
}
const initialState: TransactionFormState = {}

export function CreateTransactionForm({
    financialAccountId,
    requestId,
    today,
    wallets,
    categories,
    suggestions,
    editing,
    returnTo,
    initialWalletId,
}: {
    returnTo?: string
    initialWalletId?: string
    financialAccountId: string
    requestId: string
    today: string
    wallets: { id: string; name: string; currency: string }[]
    categories: CategoryChoice[]
    editing?: {
        recurrence?: RecurrenceEditing | null
        spread?: ExpenseSpread | null
        id: string
        version: number
        name: string
        type: "EXPENSE" | "INCOME"
        accountWalletId: string
        categoryId: string
        amount: string
        date: string
        status: "POSTED" | "PENDING"
        notes: string
    }
    suggestions: TransactionSuggestion[]
}) {
    const [editScope, setEditScope] = useState<EditScope>("ONLY")
    const [state, action, pending] = useActionState(
        editing ? updateTransaction : createTransaction,
        initialState
    )
    const defaultCategory = (type: string) =>
        categories.find(
            (category) =>
                category.type === type &&
                category.name ===
                    (type === "EXPENSE" ? "Other expenses" : "Other income") &&
                !category.parentId
        )?.id ??
        categories.find(
            (category) => category.type === type && !category.parentId
        )?.id ??
        ""
    const initialCategory = categories.find(
        (category) => category.id === editing?.categoryId
    )
    const [values, setValues] = useState({
        name: editing?.name ?? "",
        type: String(editing?.type ?? "EXPENSE"),
        accountWalletId:
            editing?.accountWalletId ?? initialWalletId ?? wallets[0]?.id ?? "",
        categoryId:
            initialCategory?.parentId ??
            initialCategory?.id ??
            (editing ? "" : defaultCategory("EXPENSE")),
        subcategoryId: initialCategory?.parentId ? initialCategory.id : "none",
        amount: editing?.amount ?? "",
        date: editing?.date ?? today,
        status: String(editing?.status ?? "POSTED"),
        notes: editing?.notes ?? "",
    })
    const update = (key: keyof typeof values, value: string) =>
        setValues((previous) => ({ ...previous, [key]: value }))
    const options = categories
        .filter(
            (category) => category.type === values.type && !category.parentId
        )
        .map((category) => ({ value: category.id, label: category.name }))
    const subcategoryOptions = [
        { value: "none", label: "No specific subcategory" },
        ...categories
            .filter(
                (category) =>
                    category.type === values.type &&
                    category.parentId === values.categoryId
            )
            .map((category) => ({ value: category.id, label: category.name })),
    ]
    const matches = suggestions
        .filter(
            (suggestion) =>
                suggestion.type === values.type &&
                suggestion.name
                    .toLocaleLowerCase()
                    .includes(values.name.trim().toLocaleLowerCase())
        )
        .slice(0, 6)
    const currency =
        wallets.find((wallet) => wallet.id === values.accountWalletId)
            ?.currency ?? ""
    return (
        <form action={action} className="flex flex-col gap-6">
            <input type="hidden" name="returnTo" value={returnTo ?? ""} />
            <input
                type="hidden"
                name="financialAccountId"
                value={financialAccountId}
            />
            <input type="hidden" name="requestId" value={requestId} />
            {editing && (
                <>
                    <input
                        type="hidden"
                        name="transactionId"
                        value={editing.id}
                    />
                    <input
                        type="hidden"
                        name="expectedVersion"
                        value={editing.version}
                    />
                </>
            )}
            <input
                type="hidden"
                name="categoryId"
                value={
                    values.subcategoryId === "none"
                        ? values.categoryId
                        : values.subcategoryId
                }
            />
            <fieldset disabled={pending} className="contents">
                <FieldGroup className="sm:grid sm:grid-cols-2">
                    <TransactionSelect
                        name="type"
                        label="Type"
                        value={values.type}
                        options={transactionTypes}
                        onChange={(type) =>
                            setValues((previous) => ({
                                ...previous,
                                type,
                                categoryId: defaultCategory(type),
                                subcategoryId: "none",
                            }))
                        }
                        error={state.errors?.type}
                    />
                    <Field data-invalid={Boolean(state.errors?.name)}>
                        <FieldLabel htmlFor="transaction-name">Name</FieldLabel>
                        <input type="hidden" name="name" value={values.name} />
                        <Combobox<TransactionSuggestion>
                            key={values.type}
                            items={matches}
                            filter={null}
                            inputValue={values.name}
                            itemToStringLabel={(item) => item.name}
                            onInputValueChange={(name, details) => {
                                // A combobox normally restores its selection on blur.
                                // This field also accepts entirely new transaction names.
                                if (
                                    details.reason === "input-change" ||
                                    details.reason === "item-press"
                                )
                                    update("name", name)
                            }}
                            onValueChange={(suggestion) => {
                                if (!suggestion) return
                                setValues((previous) => ({
                                    ...previous,
                                    name: suggestion.name,
                                    categoryId: suggestion.categoryId,
                                    subcategoryId:
                                        suggestion.subcategoryId ?? "none",
                                }))
                            }}
                        >
                            <ComboboxInput
                                id="transaction-name"
                                showTrigger={false}
                                required
                                maxLength={120}
                                autoComplete="off"
                                placeholder={
                                    values.type === "EXPENSE"
                                        ? "e.g. Your favourite restaurant"
                                        : "e.g. Monthly salary"
                                }
                                aria-invalid={Boolean(state.errors?.name)}
                                aria-describedby="transaction-name-description transaction-name-error"
                            />
                            {values.name.trim() && matches.length ? (
                                <ComboboxContent>
                                    <ComboboxList>
                                        <ComboboxGroup>
                                            <ComboboxLabel>
                                                Use previous details
                                            </ComboboxLabel>
                                            {matches.map((suggestion) => (
                                                <ComboboxItem
                                                    key={suggestion.id}
                                                    value={suggestion}
                                                >
                                                    <span className="flex min-w-0 flex-col gap-0.5 py-1">
                                                        <span className="truncate">
                                                            {suggestion.name}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {
                                                                suggestion.categoryLabel
                                                            }
                                                        </span>
                                                    </span>
                                                </ComboboxItem>
                                            ))}
                                        </ComboboxGroup>
                                    </ComboboxList>
                                </ComboboxContent>
                            ) : null}
                        </Combobox>
                        <FieldDescription id="transaction-name-description">
                            Type a name to reuse a previous transaction’s
                            category details, or enter a new name.
                        </FieldDescription>
                        {state.errors?.name ? (
                            <FieldError id="transaction-name-error">
                                {state.errors.name}
                            </FieldError>
                        ) : null}
                    </Field>
                    <Field data-invalid={Boolean(state.errors?.amount)}>
                        <FieldLabel htmlFor="transaction-amount">
                            Amount ({currency})
                        </FieldLabel>
                        <Input
                            id="transaction-amount"
                            name="amount"
                            inputMode="decimal"
                            value={values.amount}
                            onChange={(event) =>
                                update("amount", event.target.value)
                            }
                            required
                            placeholder="0.00"
                            maxLength={20}
                            aria-invalid={Boolean(state.errors?.amount)}
                            aria-describedby={
                                state.errors?.amount
                                    ? "transaction-amount-description transaction-amount-error"
                                    : "transaction-amount-description"
                            }
                        />
                        <FieldDescription id="transaction-amount-description">
                            Enter a positive amount.{" "}
                            {values.type === "EXPENSE"
                                ? "Expenses subtract from"
                                : "Incomes add to"}{" "}
                            this wallet when posted.
                        </FieldDescription>
                        {state.errors?.amount ? (
                            <FieldError id="transaction-amount-error">
                                {state.errors.amount}
                            </FieldError>
                        ) : null}
                    </Field>
                    <TransactionSelect
                        name="accountWalletId"
                        label="Wallet"
                        value={values.accountWalletId}
                        options={wallets.map((wallet) => ({
                            value: wallet.id,
                            label: `${wallet.name} (${wallet.currency})`,
                        }))}
                        onChange={(value) => update("accountWalletId", value)}
                        error={state.errors?.accountWalletId}
                    />
                    <TransactionSelect
                        name="parentCategoryId"
                        label="Category"
                        value={values.categoryId}
                        options={options}
                        onChange={(categoryId) =>
                            setValues((previous) => ({
                                ...previous,
                                categoryId,
                                subcategoryId: "none",
                            }))
                        }
                        error={state.errors?.categoryId}
                        description={
                            options.length
                                ? "Choose a category for this transaction."
                                : "No active categories for this type. Add one using Manage categories below."
                        }
                    />
                    <TransactionSelect
                        name="subcategoryId"
                        label="Subcategory (optional)"
                        value={values.subcategoryId}
                        options={subcategoryOptions}
                        onChange={(value) => update("subcategoryId", value)}
                    />
                    <Link
                        href={`/dashboard/accounts/${financialAccountId}/categories`}
                        className="text-sm underline underline-offset-4"
                    >
                        Manage categories
                    </Link>
                    <RecurrenceFields
                        initial={editing?.recurrence}
                        date={values.date}
                        error={state.errors?.repeat}
                        scopeError={state.errors?.editScope}
                        onScopeChange={(scope) => {
                            setEditScope(scope)
                            if (scope !== "ONLY" && editing)
                                setValues((previous) => ({
                                    ...previous,
                                    date: editing.date,
                                }))
                        }}
                    />
                    {editScope !== "ONLY" && (
                        <p className="text-sm text-muted-foreground">
                            Dates stay unchanged for series edits. Choose Only
                            this occurrence to change its date.
                        </p>
                    )}
                    <Field data-invalid={Boolean(state.errors?.date)}>
                        <FieldLabel htmlFor="transaction-date">Date</FieldLabel>
                        <fieldset disabled={editScope !== "ONLY"}>
                            <DatePicker
                                id="transaction-date"
                                name="date"
                                value={values.date}
                                onChange={(value) => update("date", value)}
                                aria-invalid={Boolean(state.errors?.date)}
                                aria-describedby={
                                    state.errors?.date
                                        ? "transaction-date-error"
                                        : undefined
                                }
                            />
                        </fieldset>
                        {editScope !== "ONLY" && (
                            <input
                                type="hidden"
                                name="date"
                                value={editing?.date ?? values.date}
                            />
                        )}
                        {state.errors?.date ? (
                            <FieldError id="transaction-date-error">
                                {state.errors.date}
                            </FieldError>
                        ) : null}
                    </Field>
                    <StatusSwitch
                        name="status"
                        value={values.status}
                        onValueChange={(value) => update("status", value)}
                        error={state.errors?.status}
                        description="Posted affects your balance now. Pending does not. The date never changes the status automatically."
                    />
                    <ExpenseSpreadFields
                        initial={editing?.spread}
                        date={values.date}
                        amount={values.amount}
                        currency={currency}
                        type={values.type}
                        error={state.errors?.spread}
                    />
                    <Field data-invalid={Boolean(state.errors?.notes)}>
                        <FieldLabel htmlFor="transaction-notes">
                            Notes (optional)
                        </FieldLabel>
                        <Textarea
                            id="transaction-notes"
                            name="notes"
                            value={values.notes}
                            onChange={(event) =>
                                update("notes", event.target.value)
                            }
                            maxLength={2000}
                            aria-invalid={Boolean(state.errors?.notes)}
                            aria-describedby={
                                state.errors?.notes
                                    ? "transaction-notes-error"
                                    : undefined
                            }
                        />
                        {state.errors?.notes ? (
                            <FieldError id="transaction-notes-error">
                                {state.errors.notes}
                            </FieldError>
                        ) : null}
                    </Field>
                </FieldGroup>
            </fieldset>
            {state.message ||
            state.errors?.requestId ||
            state.errors?.financialAccountId ? (
                <FieldError role="alert">
                    {state.message ??
                        state.errors?.requestId ??
                        state.errors?.financialAccountId}
                </FieldError>
            ) : null}
            <Button type="submit" disabled={pending || !values.categoryId}>
                {pending
                    ? "Saving…"
                    : editing
                      ? "Save changes"
                      : values.type === "EXPENSE"
                        ? "Add expense"
                        : "Add income"}
            </Button>
        </form>
    )
}
