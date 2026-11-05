"use server"

import { revalidateWorkspacePath } from "@/lib/workspace-cache-invalidation"
import { Prisma } from "@/generated/prisma/client"
import { requireVerifiedSession } from "@/lib/auth/session"
import {
    reorderOwnedCategoryGroups,
    listOwnedAccountCategories,
    changeOwnedCategory,
    createOwnedCategory,
    deleteOwnedCategory,
    CategoryWriteError,
} from "@/lib/categories"
import {
    validateCategoryOrderBatch,
    type CategoryOrderBatchInput,
    validCategoryName,
    parseSubcategoryNames,
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

async function refreshCategories(id: string) {
    await revalidateWorkspacePath(`/dashboard/accounts/${id}/categories`)
    await revalidateWorkspacePath(`/dashboard/accounts/${id}`)
    await revalidateWorkspacePath(`/dashboard/accounts/${id}/transactions/new`)
}

export async function createCategory(
    _state: CategoryFormState,
    form: FormData
): Promise<CategoryFormState> {
    await requireVerifiedSession()
    let names: string[] | undefined
    if (form.get("parentId") && typeof form.get("names") === "string") {
        const parsed = parseSubcategoryNames(form.get("names") as string)
        if (parsed.error) return { errors: { name: parsed.error } }
        names = parsed.names
        form.set("name", names[0])
    }
    const result = validateCategoryInput(form)
    if (!result.data) return { errors: result.errors }
    try {
        await createOwnedCategory(result.data, names)
    } catch (error) {
        return { message: errorMessage(error) }
    }
    await refreshCategories(result.data.financialAccountId)
    return {
        success: true,
        message:
            names && names.length > 1
                ? `${names.length} subcategories created.`
                : "Category created.",
    }
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
    await refreshCategories(input.financialAccountId)
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
    await refreshCategories(input.financialAccountId)
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
    await refreshCategories(input.financialAccountId)
    return { success: true }
}

export async function reorderCategories(raw: CategoryOrderBatchInput): Promise<
    | {
          success: true
          categories: Awaited<ReturnType<typeof listOwnedAccountCategories>>
      }
    | { success: false; message: string }
> {
    await requireVerifiedSession()
    const input = validateCategoryOrderBatch(raw)
    if (!input)
        return {
            success: false,
            message: "Invalid category order. Refresh and try again.",
        }
    try {
        await reorderOwnedCategoryGroups(input)
    } catch (error) {
        await refreshCategories(input.financialAccountId)
        return { success: false, message: errorMessage(error) }
    }
    await refreshCategories(input.financialAccountId)
    return {
        success: true,
        categories: await listOwnedAccountCategories(input.financialAccountId),
    }
}
