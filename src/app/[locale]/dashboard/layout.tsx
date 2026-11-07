import { AppShell } from "@/components/site/app-shell"
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <AppShell>{children}</AppShell>
}
