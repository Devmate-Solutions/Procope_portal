import AnalyticsClient from "../components/analytics-client"
import AuthenticatedLayout from "../components/AuthenticatedLayout"

export default function Dashboard() {
  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-white">
        <main className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <AnalyticsClient />
          </div>
        </main>
      </div>
    </AuthenticatedLayout>
  )
}
