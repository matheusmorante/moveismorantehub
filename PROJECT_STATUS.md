# Project Status & Pending Ideas

## Last Update: 2026-03-16

### Recent Changes (2026-03-16)
- **Environment Cleanup & Reorganization**:
    - **Repository Flatness**: Renamed internal folders (erp-admin, erp-store, etc.) to a flatter structure (`erp`, `ecommerce`, `api`, `automation`) at the root level for easier navigation and consistency with the master orchestrator.
    - **Code Consolidation**: Identified and moved orphaned service and type files from the root directory into the ERP structure (`erp/src/pages/utils/` and `erp/src/pages/types/`), resolving critical build errors on Vercel and local environments.
    - **Supabase Fixes**: Resolved a "Bad Request (400)" error in product editing by removing the non-existent `ipi_type` column from queries and mappings in `productService.ts`.
    - **Dev Environment Sync**: Restored all local state using `git reset --hard` to match work done on other machines and ensured `.env` files are correctly placed in the new folder structure.
    - **Build Optimization**: Verified and fixed the ERP production build, which is now completing successfully.

### Recent Changes (2026-03-15)
- **AI-Powered Financial Insights**:
    - **Profit Margin & Markup**: AI suggestions now include the percentage margin (markup) for each price tier.
    - **Real-Time Margin Calculator**: Added a live profit/margin monitor in the Inventory tab.
    - **Card Fee Integration**: AI price suggestions now consider a **4% card machine fee** and operational overhead for the Colombo store.
- **Enhanced Inventory & Manufacture**:
    - **Hybrid Stock Management**: Added `Showroom` and `Warehouse` stock fields to distinguish physical store inventory from the central deposit. Total stock is now automatically calculated.
    - **Manufacture Calculator**: Integrated a **Profile Handle Meter Calculator** into the product form to assist in production planning.
    - **Auto-Increment Scanning**: The QR scanner now automatically increments count by +1 per scan.
- **Logistics Intelligence & Scalability**:
    - **Dimensional Weight (DIM)**: Integrated automatic volumetric weight calculation (Factor: 6000) inside the Logistics tab.
    - **Taxed Weight Comparison**: UI now highlights the "Taxed Weight" (the higher between physical and dimensional weight) used by freight carriers.
    - **LTL Automatic Alerts**: Real-time warning system for items exceeding 68kg (150lbs), flagging the need for Less-Than-Truckload (LTL) shipping.
- **Advanced Label UX (Identification Mode)**:
    - **Vertical Header Layout**: Redesigned the `qr_product` preset with a vertical SKU/Name block on the left and a maximized QR code on the right for superior scanning speed.
    - **Logistics-First Defaults**: "Show Price" is now disabled by default for identification labels, reducing initial friction.
- **E-commerce Stability & Performance**:
    - **AI Uppercase Hard-Enforcement**: Enforced `.toUpperCase()` on all AI server responses (Titles/Descriptions) to ensure 100% consistency with brand guidelines.
    - **Vercel Build Stability**: Switched to Inter fonts and added missing dependencies (`lucide-react`, `supabase-js`) to resolve deployment errors.

### Recent Changes (2026-03-14)
- **Multi-Repo Architecture**: Project successfully migrated from a monorepo (`moveismorantehub`) to a decentralized multi-repo structure inside `morante-hub`.
    - **erp-admin** (React/Vite) isolated.
    - **erp-store** (Next.js) isolated.
    - **erp-api** (Node/Express) isolated.
    - **erp-automation** consolidated.
- **Dependency Isolation**: Individual `node_modules` and `package.json` for each repository to prevent version conflicts.
- **Centralized Governance**: New root `README.md` and repository organization.
- **Master Orchestration**: Added a root `package.json` to manage all repositories simultaneously using `concurrently`. Now `npm run dev` in the root starts Admin, Store, API, and Automation.

- **Extra Dimensions (PRO MAX)**:
    - Enabled **real-time editing of Width, Height, and Depth** directly from the label customizer for technical labels.
- **Price Label Shortcut**: 
    - Added a **"Modo Preço"** quick action button in the header and sidebar for immediate setup of price tags.
- **Label Printing System (Premium Upgrade)**: 
    - Implemented "Premium" visual standard for all labels: refined typography, higher contrast, and subtle shadows.
    - Added **High-Quality Export**: New "Baixar PNG" button using `html2canvas` for high-resolution label saving.
    - **Design Architect (Obrigações Separadas)**:
    - **Identidade de Marca vs Identificação de Produtos**: Sistema agora separa etiquetas funcionais (Preço, QR Code) de etiquetas de design (Logo Morante, 100% MDF).
    - **Navegação Contextual**: Links específicos no menu "Estoque" (para rótulos) e no menu "Design" (para identidade visual).
    - **Interface Simplificada**: Remoção de filtros de categoria na área de etiquetas para reduzir poluição visual e focar na busca direta.
    - **Estabilidade do Scanner QR**: Refatoração completa do `QRScannerModal` com gerenciamento de instâncias via refs, limpeza automática de drivers de câmera, tratamento de erros críticos e botão de reinicialização.
    - **Estrutura de Segurança de Interface**: Implementação de `ErrorBoundary` global para todos os módulos que utilizam hardware de câmera, garantindo que falhas de driver não derrubem a aplicação e ofereçam recuperação graciosa.
    - **Correção de Layout e Logística**: Ajuste de erros de aninhamento JSX no modal de lançamento de estoque e reforço na lógica de busca por SKU/Código.
    - **Deep Linking**: Acesso direto via produto via parâmetros de URL (`?productId=...`), que pré-seleciona apenas presets relevantes de identificação.
    - **Intelligent Layout**: Labels now automatically expand the QR Code and branding when other elements are disabled.
    - **Visual Refinement**: SKU/Code now has a dedicated background badge for better legibility on physical prints.
- **Sales Order Healing (Data Integrity)**:
    - **Kaline Estevão (Order 1548)**: Fixed legacy data format that was causing "R$ 0,00" display and UI crashes. Restored total value of **R$ 3.951,00** and normalized payment fields.
    - **Criado Mudo Aroma**: Restored product from draft state to active catalog using a direct Supabase script (bypass MCP error).
    - **Legacy Support**: Updated the `OrderHistoryRow` and `PaymentsSummary` types to handle old order data formats gracefully, preventing future UI breakages.
- **Product Draft Removal**:
    - **Unified Product Catalog**: Completely removed the "Rascunhos" (Drafts) functionality from the Product, Service, and Contact (Person) modules to simplify the UI and prevent data synchronization issues.
    - **Auto-Save Removal**: Disabled background auto-saving for these modules while keeping it active for Sales Orders (as requested).
- **Product Variation Overhaul (Premium UX)**:
    - **Card-Based Management**: Variations are now displayed as sleek cards instead of a crowded table, providing a cleaner overview of the product grid.
    - **Detailed Edit Modal**: Clicking a variation opens a dedicated modal for fine-tuned adjustments of Stock, Minimum Stock, Sale Price, and Cost Price.
    - **Smart Sync System**: Added explicit "Sync with Parent" toggles for Name, Price, and Cost, ensuring consistency across versions while allowing manual overrides when needed.
    - **Enhanced Financial Controls**: Each variation now has its own Cost Price field with sync logic, allowing for accurate profit calculation even on complex product mixes.
- **UI/UX Branding**: Updated page titles and subtitles across the label system to follow the "ERP Móveis Morante" premium branding guidelines.




### Pending Ideas
- [ ] Implement advanced error handling if camera permissions are denied.
- [ ] Add a toggle button inside the scanner to switch cameras manually.
- [ ] Optimize build chunks as suggested by Vite.
- [ ] Add a "Regenerate Code" button in the Product Form to allow updating SKU based on a modified description.


### Project Rules (from user_global)
- Siga princípio de código limpo e modularizado.
- Sempre salve ideias e planos pendentes em um arquivo.
- Economize o máximo de cota do plano de assinatura.
- Diferencie ambiente dev e prod em rotas e variáveis.
- Relate bugs imediatamente.
- Pergunte em caso de ambiguidade.
