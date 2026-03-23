import type { Metadata } from "next"
import "./globals.css"
import PwaRegister from "./pwa-register"

export const metadata: Metadata = {
  title: "ARTBRIDGE",
  description: "Sanat ve tasarım için çift körleme yetenek değerlendirme",
  manifest: "/manifest.webmanifest"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-indigo-600"
        >
          Ana içeriğe geç
        </a>
        <PwaRegister />
        <div id="main-content">{children}</div>
      </body>
    </html>
  )
}

