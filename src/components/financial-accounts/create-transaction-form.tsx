"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { createTransaction } from "@/app/dashboard/accounts/[id]/transactions/actions"
import {
    transactionTypes,
    type TransactionFormState,
} from "@/lib/transaction-input"
import { categorySelectOptions } from "@/lib/category-input"
import { openingStatuses } from "@/lib/wallet-input"
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
                            <SelectItem key={option.value} value={option.value}>
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
}: {
    financialAccountId: string
    requestId: string
    today: string
    wallets: { id: string; name: string; currency: string }[]
    categories: CategoryChoice[]
}) {
    const [state, action, pending] = useActionState(
        createTransaction,
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
        categories.find((category) => category.type === type)?.id ??
        ""
    const [values, setValues] = useState({
        name: "",
        type: "EXPENSE",
        accountWalletId: wallets[0]?.id ?? "",
        categoryId: defaultCategory("EXPENSE"),
        amount: "",
        date: today,
        status: "POSTED",
        notes: "",
    })
    const update = (key: keyof typeof values, value: string) =>
        setValues((previous) => ({ ...previous, [key]: value }))
    const options = categorySelectOptions(categories, values.type)
    const currency =
        wallets.find((wallet) => wallet.id === values.accountWalletId)
            ?.currency ?? ""
    return (
        <form action={action} className="flex flex-col gap-6">
            <input
                type="hidden"
                name="financialAccountId"
                value={financialAccountId}
            />
            <input type="hidden" name="requestId" value={requestId} />
            <FieldGroup>
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
                        }))
                    }
                    error={state.errors?.type}
                />
                <Field data-invalid={Boolean(state.errors?.name)}>
                    <FieldLabel htmlFor="transaction-name">Name</FieldLabel>
                    <Input
                        id="transaction-name"
                        name="name"
                        value={values.name}
                        onChange={(event) => update("name", event.target.value)}
                        required
                        maxLength={120}
                        placeholder={
                            values.type === "EXPENSE"
                                ? "e.g. Weekly groceries"
                                : "e.g. Monthly salary"
                        }
                        aria-invalid={Boolean(state.errors?.name)}
                        aria-describedby={
                            state.errors?.name
                                ? "transaction-name-error"
                                : undefined
                        }
                    />
                    {state.errors?.name ? (
                        <FieldError id="transaction-name-error">
                            {state.errors.name}
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
                    name="categoryId"
                    label="Category or subcategory"
                    value={values.categoryId}
                    options={options}
                    onChange={(value) => update("categoryId", value)}
                    error={state.errors?.categoryId}
                    description={
                        options.length
                            ? "Choose a category, or a more specific subcategory."
                            : "No active categories for this type. Add one using Manage categories below."
                    }
                />
                <Link
                    href={`/dashboard/accounts/${financialAccountId}/categories`}
                    className="text-sm underline underline-offset-4"
                >
                    Manage categories
                </Link>
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
                <Field data-invalid={Boolean(state.errors?.date)}>
                    <FieldLabel htmlFor="transaction-date">Date</FieldLabel>
                    <Input
                        id="transaction-date"
                        name="date"
                        type="date"
                        required
                        value={values.date}
                        onChange={(event) => update("date", event.target.value)}
                        aria-invalid={Boolean(state.errors?.date)}
                        aria-describedby={
                            state.errors?.date
                                ? "transaction-date-error"
                                : undefined
                        }
                    />
                    {state.errors?.date ? (
                        <FieldError id="transaction-date-error">
                            {state.errors.date}
                        </FieldError>
                    ) : null}
                </Field>
                <TransactionSelect
                    name="status"
                    label="Status"
                    value={values.status}
                    options={openingStatuses}
                    onChange={(value) => update("status", value)}
                    error={state.errors?.status}
                    description="Posted affects your balance now. Pending does not. The date never changes the status automatically."
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
                    : values.type === "EXPENSE"
                      ? "Add expense"
                      : "Add income"}
            </Button>
        </form>
    )
}
