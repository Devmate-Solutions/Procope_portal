"use client"

import { Suspense } from "react"
import {Analytics} from "./analytics"

export default function AnalyticsClient() {
  return (
    <Suspense fallback={
      <div className="text-center py-12 text-primary">
        Loading analytics...
      </div>
    }>
      <Analytics />
    </Suspense>
  )
}
