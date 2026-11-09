/** Stable palette keys are persisted on financial accounts. Keep the DB CHECK in sync. */
export const accountThemes = [
    { id: "forest", name: "Forest", color: "#286044" },
    { id: "ocean", name: "Ocean", color: "#245c9c" },
    { id: "violet", name: "Violet", color: "#7040a0" },
    { id: "rose", name: "Rose", color: "#a33162" },
    { id: "amber", name: "Amber", color: "#88500e" },
    { id: "slate", name: "Slate", color: "#475569" },
] as const
export type AccountTheme = (typeof accountThemes)[number]["id"]
export function isAccountTheme(value: unknown): value is AccountTheme {
    return accountThemes.some((theme) => theme.id === value)
}
export function accountTheme(value: unknown) {
    return accountThemes.find((theme) => theme.id === value) ?? accountThemes[0]
}
