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

  // Normalização de texto sem acentos
  const normalizeText = (str: string) =>
    str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : ""

  // Caching local de categorias para busca instantânea sem acento
  const [allDbCategories, setAllDbCategories] = useState<any[]>([])

  useEffect(() => {
    async function loadAllCategories() {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, type")
        .order("name")
      if (data) setAllDbCategories(data)
    }
    loadAllCategories()
  }, [])

  // Busca sugestões em tempo real ao digitar (Debounce)
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setSuggestions({ environments: [], categories: [], products: [] })
      setShowSuggestions(false)
      return
    }

    setLoadingSuggestions(true)
    setShowSuggestions(true)

    const timer = setTimeout(async () => {
      try {
        const normalizedQuery = normalizeText(trimmed)
        
        // 1. Filtrar Ambientes e Categorias localmente (insensível a acentos)
        const matched = allDbCategories.filter(c => 
          normalizeText(c.name).includes(normalizedQuery)
        )
        const environments = matched.filter(c => c.type === "environment").slice(0, 5)
        const categories = matched.filter(c => c.type === "category").slice(0, 5)

        // 2. Buscar Produtos no Supabase
        let prodQuery = supabase
          .from("products")
          .select("id, name, price, promo_price, slug, product_images(image_url, is_main)")
          .eq("status", "published")
          .ilike("name", `%${trimmed}%`)
          .limit(5)

        const { data: prodData, error: prodErr } = await prodQuery

        let products: any[] = []
        if (!prodErr && prodData) {
          products = prodData.map(p => {
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
        }

        setSuggestions({
          environments,
          categories,
          products
        })
      } catch (err) {
        console.error("Erro ao buscar sugestões:", err)
      } finally {
        setLoadingSuggestions(false)
      }
    }, 200) // 200ms debounce

    return () => clearTimeout(timer)
  }, [query, allDbCategories])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/?search=${encodeURIComponent(query.trim())}#produtos`)
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
