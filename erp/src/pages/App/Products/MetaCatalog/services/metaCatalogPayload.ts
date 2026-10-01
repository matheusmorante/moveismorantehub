export interface MetaCatalogProductSource {
  id: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  whatsapp_description?: string | null;
  status?: string | null;
  active?: boolean | null;
  deleted?: boolean | null;
  deleted_at?: string | null;
  opportunity_id?: string | null;
  sales_price?: number | null;
  unit_price?: number | null;
  price?: number | null;
  stock?: number | null;
  images?: string[] | null;
  brand?: string | null;
  group_name?: string | null;
  sku?: string | null;
  code?: string | null;
}

export interface MetaCatalogVariationSource {
  id: string;
  product_id: string;
  status?: string | null;
  active?: boolean | null;
  name?: string | null;
  color?: string | null;
  size?: string | null;
  sku?: string | null;
  code?: string | null;
  image_url?: string | null;
  sales_price?: number | null;
  price?: number | null;
  stock?: number | null;
}

export interface MetaCatalogOpportunitySource {
  id: string;
  name?: string | null;
  observations?: string | null;
}

export interface MetaCatalogItem {
  id: string;
  code: string;
  name: string;
  description: string;
  sales_price: number;
  stock?: number | null;
  active: true;
  status: 'published';
  isPublished: true;
  images: string[];
  brand: string;
  group_name?: string | null;
}

const globalPrefix = `🚚📦 Entrega rápida (1 a 5 dias úteis) para Curitiba e Região, consulte conosco a disponibilidade e o valor do frete

💳 Pagamento parcelado nas bandeiras VISA, MASTER, MASTERCARD, MAESTRO, HIPERCARD, ELO, em até 10x sem juros no cartão de crédito

🚨⚠️ Aceitamos Senff com juros.

✅ À vista tem desconto no pix, débito ou dinheiro!


✅ Sem taxa de frete para endereços próximos.


✅ Montagem Incluída para a retirada ou entrega.


✅ Atendimento Via WhatsApp

https://wa.me/5541997493547


🛒 VEJA MAIS DOS NOSSOS PRODUTOS CLICANDO NO LINK ABAIXO:

https://moveismorante.com.br

___________________________________

Móveis Morante

▶ CNPJ: 44.512 248/0001-07

🕒 Aberto: Seg a Sex ( 9h às 18h ) e Sab ( 9h às 17h )

🗺📍Rua Cascavel, 306, Guaraituba, Colombo - PR

____________________________________`;

export function buildMetaCatalogItems(
  products: readonly MetaCatalogProductSource[],
  variations: readonly MetaCatalogVariationSource[],
  opportunities: readonly MetaCatalogOpportunitySource[]
): MetaCatalogItem[] {
  const oppMap: Record<string, MetaCatalogOpportunitySource> = {};
  opportunities.forEach((opportunity) => {
    oppMap[opportunity.id] = opportunity;
  });

  const allItems: MetaCatalogItem[] = [];

  for (const parent of products) {
    if (
      parent.deleted ||
      parent.deleted_at !== null ||
      parent.status === 'hidden' ||
      parent.active === false
    ) {
      continue;
    }

    const parentVariations = variations.filter(
      (variation) =>
        variation.product_id === parent.id &&
        variation.status !== 'hidden' &&
        variation.active !== false
    );
    const parentTitle =
      parent.name ||
      parent.title ||
      (parent.description ? parent.description.split('\n')[0] : 'Produto Morante');

    const descriptionParts: string[] = [globalPrefix];
    const opportunity = parent.opportunity_id ? oppMap[parent.opportunity_id] : null;
    if (opportunity?.observations) {
      descriptionParts.push(
        `***Aviso Importante (${opportunity.name}): ${opportunity.observations}***`
      );
    }

    const baseDescription = parent.whatsapp_description || parent.description || parentTitle;
    if (baseDescription) descriptionParts.push(baseDescription);

    const fullDescription = descriptionParts.join('\n\n');

    if (parentVariations.length > 0) {
      for (const variation of parentVariations) {
        const variationName = variation.name || variation.color || variation.size || 'Variação';
        const variationTitle = `${parentTitle} - ${variationName}`;

        let variationImages: string[] = [];
        if (variation.image_url) {
          variationImages = String(variation.image_url)
            .split(',')
            .map((image) => image.trim())
            .filter(Boolean);
        }
        if (
          variationImages.length === 0 &&
          Array.isArray(parent.images) &&
          parent.images.length > 0
        ) {
          variationImages = parent.images;
        }

        allItems.push({
          id: variation.id,
          code: variation.sku || variation.code || variation.id,
          name: variationTitle,
          description: fullDescription,
          sales_price:
            variation.sales_price ||
            variation.price ||
            parent.sales_price ||
            parent.unit_price ||
            parent.price ||
            0,
          stock: variation.stock !== undefined ? variation.stock : parent.stock,
          active: true,
          status: 'published',
          isPublished: true,
          images: variationImages,
          brand: parent.brand || 'Móveis Morante',
          group_name: parent.group_name,
        });
      }
    } else {
      allItems.push({
        id: parent.id,
        code: parent.code || parent.sku || parent.id,
        name: parentTitle,
        description: fullDescription,
        sales_price: parent.sales_price || parent.unit_price || parent.price || 0,
        stock: parent.stock,
        active: true,
        status: 'published',
        isPublished: true,
        images: Array.isArray(parent.images) ? parent.images : [],
        brand: parent.brand || 'Móveis Morante',
        group_name: parent.group_name,
      });
    }
  }

  return allItems;
}
