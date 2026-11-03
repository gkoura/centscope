import { AppShell } from "@/components/site/app-shell"
export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <AppShell>{children}</AppShell>
}
