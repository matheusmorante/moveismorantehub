export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      environments: {
        Row: {
          id: string
          name: string
          slug: string
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          image_url?: string | null
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          image_url?: string | null
          created_at?: string
        }
      }
      environment_categories: {
        Row: {
          environment_id: string
          category_id: string
        }
        Insert: {
          environment_id: string
          category_id: string
        }
        Update: {
          environment_id?: string
          category_id?: string
        }
      }
      materials: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      technical_specifications: {
        Row: {
          id: string
          name: string
          slug: string
          input_type: "materials" | "text"
          options: Json
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          input_type?: "materials" | "text"
          options?: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          input_type?: "materials" | "text"
          options?: Json
          created_at?: string
        }
      }
      opportunities: {
        Row: {
          id: string
          name: string
          slug: string
          badge_color: string
          border_color: string
          border_style: string
          badge_animation: string
          active: boolean
          title_color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          badge_color?: string
          border_color?: string
          border_style?: string
          badge_animation?: string
          active?: boolean
          title_color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          badge_color?: string
          border_color?: string
          border_style?: string
          badge_animation?: string
          active?: boolean
          title_color?: string | null
          created_at?: string
        }
      }
      store_style_settings: {
        Row: {
          id: boolean
          border_width: "thin" | "medium" | "strong"
          border_radius: "square" | "soft" | "rounded"
          shadow: "none" | "soft" | "elevated"
          opportunity_emphasis: "subtle" | "highlighted" | "animated"
          button_style: "standard" | "rounded"
          product_image_fit: "cover" | "contain"
          primary_color: string
          accent_color: string
          background_color: string
          hero_overlay: "soft" | "dark" | "vibrant"
          product_grid_columns: "compact" | "comfortable" | "large"
          product_grid_gap: "tight" | "normal" | "spacious"
          updated_at: string
        }
        Insert: {
          id?: boolean
          border_width?: "thin" | "medium" | "strong"
          border_radius?: "square" | "soft" | "rounded"
          shadow?: "none" | "soft" | "elevated"
          opportunity_emphasis?: "subtle" | "highlighted" | "animated"
          button_style?: "standard" | "rounded"
          product_image_fit?: "cover" | "contain"
          primary_color?: string
          accent_color?: string
          background_color?: string
          hero_overlay?: "soft" | "dark" | "vibrant"
          product_grid_columns?: "compact" | "comfortable" | "large"
          product_grid_gap?: "tight" | "normal" | "spacious"
          updated_at?: string
        }
        Update: {
          id?: boolean
          border_width?: "thin" | "medium" | "strong"
          border_radius?: "square" | "soft" | "rounded"
          shadow?: "none" | "soft" | "elevated"
          opportunity_emphasis?: "subtle" | "highlighted" | "animated"
          button_style?: "standard" | "rounded"
          product_image_fit?: "cover" | "contain"
          primary_color?: string
          accent_color?: string
          background_color?: string
          hero_overlay?: "soft" | "dark" | "vibrant"
          product_grid_columns?: "compact" | "comfortable" | "large"
          product_grid_gap?: "tight" | "normal" | "spacious"
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          price: number
          category_id: string | null
          featured: boolean
          measures: string | null
          material: string | null
          material_id: string | null
          technical_specs: Json | null
          width: string | null
          depth: string | null
          height: string | null
          depth_use_length: boolean | null
          status: string | null
          is_salvado: boolean | null
          promo_price: number | null
          opportunity_id: string | null
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          price: number
          category_id?: string | null
          featured?: boolean
          measures?: string | null
          material?: string | null
          material_id?: string | null
          technical_specs?: Json | null
          width?: string | null
          depth?: string | null
          height?: string | null
          status?: string | null
          is_salvado?: boolean | null
          promo_price?: number | null
          opportunity_id?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          price?: number
          category_id?: string | null
          featured?: boolean
          measures?: string | null
          material?: string | null
          material_id?: string | null
          technical_specs?: Json | null
          width?: string | null
          depth?: string | null
          height?: string | null
          status?: string | null
          is_salvado?: boolean | null
          promo_price?: number | null
          opportunity_id?: string | null
          created_at?: string
          deleted_at?: string | null
        }
      }
      product_images: {
        Row: {
          id: string
          product_id: string | null
          image_url: string
          is_main: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          image_url: string
          is_main?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          image_url?: string
          is_main?: boolean
          created_at?: string
        }
      }
      product_categories: {
        Row: {
          product_id: string
          category_id: string
        }
        Insert: {
          product_id: string
          category_id: string
        }
        Update: {
          product_id?: string
          category_id?: string
        }
      }
      banners: {
        Row: {
          id: string
          title: string | null
          image_url: string
          link_url: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title?: string | null
          image_url: string
          link_url?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string | null
          image_url?: string
          link_url?: string | null
          active?: boolean
          created_at?: string
        }
      }
    }
  }
}
