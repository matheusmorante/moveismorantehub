"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

export function useSearch() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  
  // Sugestões
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<{
    environments: any[]
    categories: any[]
    products: any[]
  }>({ environments: [], categories: [], products: [] })

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  // Fecha sugestões ao clicar fora do container de busca
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Busca sugestões em tempo real ao digitar (Debounce)
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions({ environments: [], categories: [], products: [] })
      setShowSuggestions(false)
      return
    }

    setLoadingSuggestions(true)
    setShowSuggestions(true)

    const timer = setTimeout(async () => {
      try {
        const searchTerm = query.trim()
        
        // 1. Buscar Ambientes e Categorias
        const { data: catData } = await supabase
          .from("categories")
          .select("id, name, slug, type")
          .ilike("name", `%${searchTerm}%`)
          .limit(10)

        // 2. Buscar Produtos
        const { data: prodData } = await supabase
          .from("products")
          .select("id, name, price, promo_price, slug, product_images(image_url, is_main)")
          .is("deleted_at", null)
          .ilike("name", `%${searchTerm}%`)
          .limit(5)

        const environments = (catData || []).filter(c => c.type === "environment")
        const categories = (catData || []).filter(c => c.type === "category")

        const products = (prodData || []).map(p => {
          const mainImg = p.product_images?.find((img: any) => img.is_main)?.image_url || 
                          p.product_images?.[0]?.image_url || 
                          ""
          return {
            id: p.id,
            name: p.name,
            price: p.price,
            promo_price: p.promo_price,
            slug: p.slug,
            image: mainImg
          }
        })

        setSuggestions({
          environments,
          categories,
          products
        })
      } catch (err) {
        console.error("Erro ao buscar sugestões:", err)
        setSuggestions({ environments: [], categories: [], products: [] })
      } finally {
        setLoadingSuggestions(false)
      }
    }, 250) // 250ms debounce

    return () => clearTimeout(timer)
  }, [query])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/?search=${encodeURIComponent(query.trim())}`)
    setIsOpen(false)
    setShowSuggestions(false)
  }

  function close() {
    setIsOpen(false)
    setQuery("")
    setShowSuggestions(false)
  }

  return { 
    isOpen, 
    setIsOpen, 
    query, 
    setQuery, 
    inputRef, 
    searchContainerRef,
    submit, 
    close, 
    showSuggestions, 
    setShowSuggestions, 
    loadingSuggestions, 
    suggestions 
  }
}
