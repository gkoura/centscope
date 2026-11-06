import { SectionLoading } from "@/components/site/section-loading"
export default function AnalyticsLoading() {
    return (
        <main className="workspace-page">
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <SectionLoading label="Loading analytics…" />
        </main>
    )
}
