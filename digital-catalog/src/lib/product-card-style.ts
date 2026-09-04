export type ProductCardStyle = {
  border_width: "thin" | "medium" | "strong"
  border_radius: "square" | "soft" | "rounded"
  shadow: "none" | "soft" | "elevated"
  opportunity_emphasis: "subtle" | "highlighted" | "animated"
  button_style: "standard" | "rounded"
  product_image_fit: "cover" | "contain"
}

export type StoreDesignSettings = ProductCardStyle & {
  primary_color: string
  accent_color: string
  background_color: string
  hero_overlay: "soft" | "dark" | "vibrant"
  product_grid_columns: "compact" | "comfortable" | "large" | number
  product_grid_gap: "tight" | "normal" | "spacious" | "small" | "medium" | "large"
}

export const defaultProductCardStyle: ProductCardStyle = {
  border_width: "medium",
  border_radius: "square",
  shadow: "soft",
  opportunity_emphasis: "animated",
  button_style: "standard",
  product_image_fit: "cover",
}

export const defaultStoreDesignSettings: StoreDesignSettings = {
  ...defaultProductCardStyle,
  primary_color: "#173f7a",
  accent_color: "#f4c430",
  background_color: "#ffffff",
  hero_overlay: "dark",
  product_grid_columns: "comfortable",
  product_grid_gap: "normal",
}

export const productCardStyleClasses = {
  border_width: {
    thin: "border",
    medium: "border-2",
    strong: "border-4",
  },
  border_radius: {
    square: "rounded-none",
    soft: "rounded-xl",
    rounded: "rounded-3xl",
  },
  shadow: {
    none: "shadow-none hover:shadow-md",
    soft: "shadow-md hover:shadow-xl",
    elevated: "shadow-lg hover:shadow-2xl",
  },
  opportunity_emphasis: {
    subtle: "",
    highlighted: "ring-2 ring-offset-2 ring-current/10",
    animated: "animate-pulse",
  },
  button_style: {
    standard: "rounded-md",
    rounded: "rounded-full",
  },
  product_image_fit: {
    cover: "object-cover",
    contain: "object-contain bg-white",
  },
} as const

export const productGridStyleClasses = {
  columns: {
    compact: "grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7",
    comfortable: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
    large: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    // Suporte para valores numéricos do banco de dados
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  },
  gap: {
    tight: "gap-2 md:gap-3",
    normal: "gap-4 md:gap-6",
    spacious: "gap-6 md:gap-8",
    // Suporte para valores de texto do banco de dados
    small: "gap-2 md:gap-3",
    medium: "gap-4 md:gap-6",
    large: "gap-6 md:gap-8",
  },
} as const

export function getOpportunityTitleColor(opportunity?: {
  name?: string
  slug?: string
  title_color?: string | null
  badge_color?: string | null
} | null): string {
  if (!opportunity) return 'inherit'
  
  if (opportunity.title_color && opportunity.title_color.trim()) {
    return opportunity.title_color.trim()
  }

  const isSalvado = 
    opportunity.slug === 'salvado' || 
    opportunity.name?.toLowerCase()?.includes('salvado')

  if (isSalvado) {
    return '#EA580C' // Laranja vibrante de salvados
  }

  const badgeColor = opportunity.badge_color || ''

  if (badgeColor.startsWith('#') || badgeColor.startsWith('rgb')) {
    return badgeColor
  }

  if (badgeColor.includes('red')) return '#DC2626'
  if (badgeColor.includes('orange')) return '#EA580C'
  if (badgeColor.includes('amber')) return '#D97706'
  if (badgeColor.includes('yellow')) return '#CA8A04'
  if (badgeColor.includes('emerald') || badgeColor.includes('green')) return '#16A34A'
  if (badgeColor.includes('teal')) return '#0D9488'
  if (badgeColor.includes('blue')) return '#2563EB'
  if (badgeColor.includes('indigo') || badgeColor.includes('purple')) return '#7C3AED'
  if (badgeColor.includes('pink') || badgeColor.includes('rose')) return '#DB2777'

  return 'inherit'
}
