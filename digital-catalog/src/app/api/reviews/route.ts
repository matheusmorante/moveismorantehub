import { NextResponse } from "next/server"

export async function GET() {
  const PLACE_ID = "ChIJC0aILWnp3JQRy3F4VjNjajw"
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!API_KEY) {
    return NextResponse.json({ error: "API Key missing" }, { status: 500 })
  }

  try {
    // Usando a PLACES API (NEW) conforme sugerido pelo erro do Google
    const url = `https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=pt-BR`
    
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        // Definindo os campos necessários (Field Mask) - Essencial na API Nova
        "X-Goog-FieldMask": "reviews,rating,userRatingCount"
      }
    })

    const data = await response.json()

    if (data.error) {
      console.error("Google Places API (New) Error:", data.error)
      return NextResponse.json({ 
        error: data.error.status, 
        message: data.error.message 
      }, { status: 400 })
    }

    // Adaptando o formato da API Nova para o nosso componente
    const mappedReviews = (data.reviews || []).map((review: any) => {
      // Log discreto no servidor para depuração das fotos
      if (review.authorAttribution?.photoUri) {
        console.log(`Foto encontrada para ${review.authorAttribution.displayName}`);
      }

      return {
        author_name: review.authorAttribution?.displayName || "Cliente",
        profile_photo_url: review.authorAttribution?.photoUri || "",
        rating: review.rating,
        relative_time_description: review.relativePublishTimeDescription,
        text: review.text?.text || ""
      }
    })

    return NextResponse.json({
      reviews: mappedReviews,
      rating: data.rating,
      user_ratings_total: data.userRatingCount
    })
    
  } catch (error: any) {
    console.error("Erro fatal na busca de reviews:", error.message)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
