import React from 'react';
import { useCategoriesAndEnvironments } from './hooks/useCategoriesAndEnvironments';
import { CategoriesHeader } from './components/CategoriesHeader';
import { EnvironmentsTable } from './components/EnvironmentsTable';
import { CategoriesListSection } from './components/CategoriesListSection';
import { CategoryEnvironmentModal } from './modals/CategoryEnvironmentModal';

const CategoriesAndEnvironments: React.FC = () => {
    const {
        environments,
        categories,
        loading,
        isSubmitting,
        showModal,
        editingNode,
        nameInput,
        setNameInput,
        selectedLinks,
        selectedAttributes,
        setSelectedAttributes,
        isLoadingAttributes,
        attributeLoadFailed,
        hasAddedRequiredAttributes,
        closeForm,
        handleSave,
        handleDelete,
        handleUnlink,
        openEditEnvironment,
        openEditCategory,
        openNewEnvironment,
        openNewCategory,
        toggleLink,
        activeView,
        setActiveView,
        categoryFilter,
        searchTerm,
        setSearchTerm,
        handleViewOrphans,
        totalOrphans
    } = useCategoriesAndEnvironments();

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 flex flex-col gap-6 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
            <CategoriesHeader
                onNewEnvironment={openNewEnvironment}
                onNewCategory={() => openNewCategory()}
                activeView={activeView}
                onViewChange={setActiveView}
                totalOrphans={totalOrphans}
                onViewOrphans={handleViewOrphans}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
            />

            {activeView === 'ambiente' ? (
                <EnvironmentsTable
                    environments={environments}
                    categories={categories}
                    onEditEnvironment={openEditEnvironment}
                    onDeleteEnvironment={id => handleDelete(id, true)}
                    onEditCategory={openEditCategory}
                    onUnlinkCategory={handleUnlink}
                    onLinkCategoryToEnvironment={openNewCategory}
                    searchTerm={searchTerm}
                />
            ) : (
                <CategoriesListSection
                    categories={categories}
                    environments={environments}
                    onEditCategory={openEditCategory}
                    onDeleteCategory={id => handleDelete(id, false)}
                    initialFilter={categoryFilter}
                    searchTerm={searchTerm}
                />
            )}

            <CategoryEnvironmentModal
                showModal={showModal}
                editingNode={editingNode}
                nameInput={nameInput}
                onChangeNameInput={setNameInput}
                selectedLinks={selectedLinks}
                selectedAttributes={selectedAttributes}
                setSelectedAttributes={setSelectedAttributes}
                isLoadingAttributes={isLoadingAttributes}
                attributeLoadFailed={attributeLoadFailed}
                hasAddedRequiredAttributes={hasAddedRequiredAttributes}
                onToggleLink={toggleLink}
                categories={categories}
                environments={environments}
                isSubmitting={isSubmitting}
                onClose={closeForm}
                onSave={handleSave}
                onDelete={handleDelete}
            />
        </div>
    );
};

export default CategoriesAndEnvironments;
