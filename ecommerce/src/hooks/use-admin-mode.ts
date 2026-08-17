"use client"

import { useState, useEffect } from "react"

export function useAdminMode() {
  const [isAdminMode, setIsAdminMode] = useState(false)

  useEffect(() => {
    // Carrega o estado inicial do localStorage
    const saved = localStorage.getItem("admin-mode-active")
    setIsAdminMode(saved === "true")

    // Escuta mudanças em outras abas/janelas
    const handleStorageChange = () => {
      const current = localStorage.getItem("admin-mode-active")
      setIsAdminMode(current === "true")
    }

    window.addEventListener("storage", handleStorageChange)
    // Custom event para mudanças na mesma aba
    window.addEventListener("admin-mode-toggle", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("admin-mode-toggle", handleStorageChange)
    }
  }, [])

  const toggleAdminMode = () => {
    const newValue = !isAdminMode
    localStorage.setItem("admin-mode-active", String(newValue))
    setIsAdminMode(newValue)
    window.dispatchEvent(new Event("admin-mode-toggle"))
  }

  return { isAdminMode, toggleAdminMode }
}
