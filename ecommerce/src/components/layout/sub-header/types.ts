export interface Category {
  id: string
  name: string
  slug: string
  type: "environment" | "category"
}

export interface Relationship {
  parent_id: string
  child_id: string
}
