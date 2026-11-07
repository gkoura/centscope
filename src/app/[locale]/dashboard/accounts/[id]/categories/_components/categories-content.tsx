import { CachedCategories } from "@/components/workspace/cached-categories"
export async function CategoriesContent({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    return <CachedCategories accountId={(await params).id} />
}
