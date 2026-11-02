export default function Loading() {
    return (
        <div role="status" className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded-md bg-muted" />
            <div className="h-32 rounded-md bg-muted" />
            <span className="sr-only">Loading...</span>
        </div>
    )
}
