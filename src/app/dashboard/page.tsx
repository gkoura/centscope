export default async function DashboardPage() {
    await new Promise((resolve) => setTimeout(resolve, 3000))

    throw new Error("Test error boundary")

    return (
        <main>
            <h1>Dashboard</h1>
        </main>
    )
}
