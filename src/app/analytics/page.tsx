import AnalyticsClient from "../components/analytics-client"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white">
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <AnalyticsClient />
        </div>
      </main>
    </div>
  )
}
