# AI-powered Purchase Order System (Modern & Efficient)

Implement a robust Purchase Order (Pedido de Compra) system within the Stock submenu, allowing for manual creation and AI-driven OCR from invoice photos.

## Objectives
- **Submenu Integration**: Add "Pedidos de Compra" under the Stock menu.
- **Dual Flow**: Support manual entry and fully automated entry via camera/photo.
- **AI Name Mapping**: Automatically resolve differences between supplier product names and shop product names using LLM logic.
- **Efficiency**: Use mobile camera directly for immediate scanning.

## Proposed Changes

### [Frontend] Stock Submenu
#### [MODIFY] [Navigation]
- Add "Pedidos de Compra" link in the sidebar under Stock.

#### [NEW] [PurchaseOrder/Index.tsx]
- Main dashboard for purchase orders.
- "Novo Pedido" button with options: Manual, Camera, or Upload Photo.

#### [NEW] [PurchaseOrder/OCRScanner.tsx]
- Implementation using `react-html5-camera-photo` or similar for mobile capture.
- Integration with Supabase Edge Functions + Google Vision/Gemini for OCR.

### [Backend] AI Processing
#### [NEW] [Edge Function] `process-invoice-ocr`
- Receives photo → Extracts text → Identifies Supplier (from DB) → Identifies Products.
- **Smart Matching Logic**: Uses Gemini to map "DESCRIÇÃO FORNECEDOR" to "NOME PRODUTO LOJA" by comparing features, sizes, and colors.

### [Data] Database Schema
- **Table**: `purchase_orders` (id, supplier_id, status, total_value, raw_ocr_data, items: JSONB).
- **Table**: `purchase_order_items` (id, purchase_order_id, product_id, quantity, unit_price, cost_price).

## Verification Plan
### Automated Tests
- Mock OCR response testing correct product mapping.
### Manual Verification
- Take a photo of the ADF BOX invoice and verify if it maps "CABECEIRA ADF MILENA" to the registered "Cabeceira Milena".
