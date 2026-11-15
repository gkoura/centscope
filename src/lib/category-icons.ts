/** Persist these keys, never component names, markup, or user-provided SVG. */
export const categoryIcons = [
    { key: "tag", label: "Tag / Other" },
    { key: "repeat", label: "Repeat / Recurring / Subscription" },
    { key: "calendar", label: "Calendar / Scheduled / Regular" },
    { key: "clock", label: "Clock / Time" },
    { key: "folder", label: "Folder / General" },
    { key: "circle", label: "Circle / Basic" },
    { key: "star", label: "Star / Favorites" },
    { key: "heart", label: "Heart / Personal" },
    { key: "users", label: "Users / Shared / Group" },
    { key: "flag", label: "Flag / Priority" },
    { key: "circle-check", label: "Check / Completed" },
    { key: "arrow-left-right", label: "Arrows / Exchange" },
    { key: "ellipsis", label: "More / Miscellaneous" },
    { key: "utensils", label: "Food / Restaurants" },
    { key: "coffee", label: "Coffee / Drinks" },
    { key: "house", label: "Home / Bills" },
    { key: "car", label: "Car / Transport" },
    { key: "bus", label: "Bus / Public transport" },
    { key: "shopping-bag", label: "Shopping / Clothing" },
    { key: "shopping-cart", label: "Groceries / Supermarket" },
    { key: "heart-pulse", label: "Health / Medical" },
    { key: "pill", label: "Medicine / Pharmacy" },
    { key: "ticket", label: "Leisure / Entertainment" },
    { key: "gamepad", label: "Games / Hobbies" },
    { key: "plane", label: "Travel / Holidays" },
    { key: "gift", label: "Gifts / Donations" },
    { key: "graduation-cap", label: "Education / Learning" },
    { key: "baby", label: "Children / Family" },
    { key: "paw-print", label: "Pets / Animals" },
    { key: "dumbbell", label: "Fitness / Sport" },
    { key: "briefcase", label: "Salary / Work" },
    { key: "wallet", label: "Income / Money" },
    { key: "landmark", label: "Bank / Taxes" },
    { key: "chart-no-axes-combined", label: "Investments / Savings" },
    { key: "smartphone", label: "Phone / Technology" },
    { key: "wifi", label: "Internet / Subscriptions" },
    { key: "zap", label: "Electricity / Energy" },
    { key: "wrench", label: "Repairs / Maintenance" },
    { key: "scissors", label: "Personal care / Hair" },
    { key: "music", label: "Music" },
] as const
export type CategoryIconKey = (typeof categoryIcons)[number]["key"]
const keys = new Set<string>(categoryIcons.map(({ key }) => key))
export function isCategoryIconKey(value: unknown): value is CategoryIconKey {
    return typeof value === "string" && keys.has(value)
}
export function resolveCategoryIcon(
    iconKey?: string | null,
    parentIconKey?: string | null
): CategoryIconKey {
    if (isCategoryIconKey(iconKey)) return iconKey
    if (isCategoryIconKey(parentIconKey)) return parentIconKey
    return "tag"
}
export const seededCategoryIcons: Record<string, CategoryIconKey> = {
    "Food & drink": "utensils",
    "Home & bills": "house",
    Transport: "car",
    Shopping: "shopping-bag",
    Health: "heart-pulse",
    Leisure: "ticket",
    "Other expenses": "tag",
    Salary: "briefcase",
    "Other income": "wallet",
}
