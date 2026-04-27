const paymentMethods = [
    "Dinheiro",
    "Pix",
    "Cartão de Débito",
    ...Array.from({ length: 12 }, (_, i) => `Cartão de Crédito ${i + 1}x`),
    ...Array.from({ length: 10 }, (_, i) => `Promissória ${i + 1}x`),
    "Verificar"
];

export default paymentMethods;