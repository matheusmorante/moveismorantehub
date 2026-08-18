"use client"

import { usePathname } from "next/navigation"
import { Suspense } from "react"
import { Header } from "./header"
import { SubHeader } from "./sub-header"
import { Footer } from "./footer"
import { WhatsAppButton } from "./whatsapp-button"

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname.startsWith("/admin")

  if (isAdminRoute) {
    return <>{children}</>
  }

  return (
    <>
      <Header />
      <Suspense fallback={<div className="h-[46px] sm:h-[54px] bg-primary animate-pulse w-full" />}>
        <SubHeader />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
