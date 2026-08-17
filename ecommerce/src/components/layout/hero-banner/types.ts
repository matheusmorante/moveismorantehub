export type BannerType = "salvados" | "default"

export interface Banner {
  id: number
  title: string
  subtitle: string
  image: string
  link: string
  buttonText: string
  type: BannerType
}
