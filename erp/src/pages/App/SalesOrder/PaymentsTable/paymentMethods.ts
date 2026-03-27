const paymentMethods = [
    "Dinheiro",
    "Pix",
    "Cartão de Débito",
    ...Array.from({ length: 10 }, (_, i) => `Cartão de Crédito ${i + 1}x`),
    "WhatsApp",
    "Verificar"
];

export default paymentMethods;