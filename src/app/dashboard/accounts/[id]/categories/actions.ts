"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@/generated/prisma/client"
import { requireVerifiedSession } from "@/lib/auth/session"
import {
    reorderOwnedCategories,
    changeOwnedCategory,
    createOwnedCategory,
    deleteOwnedCategory,
    CategoryWriteError,
} from "@/lib/categories"
import {
    validateCategoryOrder,
    type CategoryOrderInput,
    validCategoryName,
    validateCategoryEdit,
    validateCategoryInput,
    type CategoryFormState,
} from "@/lib/category-input"

function errorMessage(error: unknown) {
    if (error instanceof CategoryWriteError) return error.message
    if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    )
        return "An active category with this name already exists here."
    return "We couldn’t save your category. Please try again."
}

function refreshCategories(id: string) {
    revalidatePath(`/dashboard/accounts/${id}/categories`)
    revalidatePath(`/dashboard/accounts/${id}`)
    revalidatePath(`/dashboard/accounts/${id}/transactions/new`)
}

export async function createCategory(
    _state: CategoryFormState,
    form: FormData
): Promise<CategoryFormState> {
    await requireVerifiedSession()
    const result = validateCategoryInput(form)
    if (!result.data) return { errors: result.errors }
    try {
        await createOwnedCategory(result.data)
    } catch (error) {
        return { message: errorMessage(error) }
    }
    refreshCategories(result.data.financialAccountId)
    return { success: true, message: "Category created." }
}

export async function renameCategory(
    _state: CategoryFormState,
    form: FormData
): Promise<CategoryFormState> {
    await requireVerifiedSession()
    const input = validateCategoryEdit(form)
    if (!input) return { message: "Reload this page and try again." }
    if (!validCategoryName(input.name))
        return {
            errors: {
                name: "Enter a category name between 1 and 80 characters.",
            },
        }
    try {
        await changeOwnedCategory(input, false)
    } catch (error) {
        return { message: errorMessage(error) }
    }
    refreshCategories(input.financialAccountId)
    return { success: true }
}

export async function archiveCategory(
    _state: CategoryFormState,
    form: FormData
): Promise<CategoryFormState> {
    await requireVerifiedSession()
    const input = validateCategoryEdit(form)
    if (!input) return { message: "Reload this page and try again." }
    try {
        await changeOwnedCategory(input, true)
    } catch (error) {
        return { message: errorMessage(error) }
    }
    refreshCategories(input.financialAccountId)
    return { success: true }
}

export async function deleteCategory(
    _state: CategoryFormState,
    form: FormData
): Promise<CategoryFormState> {
    await requireVerifiedSession()
    const input = validateCategoryEdit(form)
    if (!input) return { message: "Reload this page and try again." }
    try {
        await deleteOwnedCategory(input)
    } catch (error) {
        if (error instanceof CategoryWriteError)
            return { message: error.message }
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2003"
        )
            return { message: "This category is in use and cannot be deleted." }
        return {
            message: "We couldn’t delete your category. Please try again.",
        }
    }
    refreshCategories(input.financialAccountId)
    return { success: true }
}

export async function reorderCategories(
    raw: CategoryOrderInput
): Promise<{ success: boolean; message?: string }> {
    await requireVerifiedSession()
    const input = validateCategoryOrder(raw)
    if (!input)
        return {
            success: false,
            message: "Invalid category order. Refresh and try again.",
        }
    try {
        await reorderOwnedCategories(input)
    } catch (error) {
        refreshCategories(input.financialAccountId)
        return { success: false, message: errorMessage(error) }
    }
    refreshCategories(input.financialAccountId)
    return { success: true }
}
