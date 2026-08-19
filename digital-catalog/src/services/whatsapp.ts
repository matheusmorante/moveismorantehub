import { CartItem } from "@/hooks/use-cart";
import { formatCurrency } from "@/lib/utils";

const WHATSAPP_NUMBER = "41997493547";

export const generateWhatsAppLink = (message: string) => {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
};

export const getProductShareText = (
  name: string, 
  price: number, 
  promoPrice?: number | null, 
  url?: string,
  opportunity?: string,
  measures?: string
) => {
  const title = `*${name}*`;
  const oppText = opportunity ? ` *(${opportunity})*` : "";
  
  let priceText = "";
  if (promoPrice) {
    priceText = `*De: ~${formatCurrency(price)}~ por ${formatCurrency(promoPrice)}*`;
  } else {
    priceText = `*Preço: ${formatCurrency(price)}*`;
  }

  const measuresText = measures ? `\n*Medidas: ${measures}*` : "";
  
  let text = `${title}${oppText}\n${priceText}${measuresText}`;
  if (url) {
    text += `\n\nConfira no site:\n${url}`;
  }
  return text;
};


export const sendProductInterest = (productName: string) => {
  const message = `Olá, tenho interesse no produto ${productName}`;
  const link = generateWhatsAppLink(message);
  window.open(link, "_blank");
};

export const sendCartInterest = (items: CartItem[], totalPrice: number) => {
  let message = "Olá, tenho interesse nos seguintes produtos:\n\n";

  items.forEach((item) => {
    message += `- ${item.name} (${item.quantity}x) - ${formatCurrency(item.price * item.quantity)}\n`;
  });

  message += `\nTotal: ${formatCurrency(totalPrice)}`;
  
  const link = generateWhatsAppLink(message);
  window.open(link, "_blank");
};
