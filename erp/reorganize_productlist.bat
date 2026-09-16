@echo off
cd c:\Users\Rosilene\Desktop\morantehub\erp\src\pages\App\Products\ProductList

mkdir components 2>nul
mkdir hooks 2>nul
mkdir utils 2>nul
mkdir modals 2>nul

:: Components
move ProductCard.tsx components\
move ProductTable.tsx components\
move ProductRow.tsx components\
move ChannelStatusBadges.tsx components\
move ProductBulkActionsToolbar.tsx components\
move ProductCardActions.tsx components\
move ProductCardVariationList.tsx components\
move ProductRowActionsCell.tsx components\
move ProductRowDescriptionCell.tsx components\
move ProductRowModals.tsx components\
move ProductRowStandardCells.tsx components\

:: Hooks
move useProducts.ts hooks\
move useProductsCatalogActions.ts hooks\
move useProductsActivationValidation.ts hooks\
move useProductsActivePersistence.ts hooks\
move useProductsDeletionActions.ts hooks\
move useVariationExitFlags.ts hooks\
move useProductMetadata.ts hooks\

:: Utils / State
move productActivationState.ts utils\
move productActivationState.test.ts utils\
move productCatalogState.ts utils\
move productCatalogState.test.ts utils\
move productSelection.ts utils\
move productSelection.test.ts utils\
move productTableColumns.ts utils\
move productTableColumns.test.ts utils\
move catalogPublicationValidation.test.ts utils\
move productListFiltering.ts utils\
move productListTransformers.ts utils\
move getVariationDisplayName.ts utils\
move registeredVariationCount.ts utils\

:: Modals
move MergeVariationModal.tsx modals\
move MoveVariationFamilyModal.tsx modals\
