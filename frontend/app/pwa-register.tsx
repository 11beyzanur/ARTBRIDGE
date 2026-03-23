"use client"

import { useEffect } from "react"

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // no-op: PWA support is progressive
    })
  }, [])

  return null
}

