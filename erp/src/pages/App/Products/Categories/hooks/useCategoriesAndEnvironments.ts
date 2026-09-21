import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
    fetchEnvironments,
    fetchCategories,
    fetchCategoryProductCounts,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    createCategory,
    updateCategory,
    deleteCategory,
    unlinkCategoryFromEnvironment,
    fetchCategoryRequiredAttributes
} from '@/pages/utils/categoryService';
import { AttributeNode } from '@/components/AttributeAutocomplete';
import {
    EnvironmentNode,
    CategoryNode,
    ModalType,
    EditingNode,
    ActiveViewType,
    CategoryFilterType
} from '../types/categoryEnvironment.types';

export function useCategoriesAndEnvironments() {
    const [environments, setEnvironments] = useState<EnvironmentNode[]>([]);
    const [categories, setCategories] = useState<CategoryNode[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Visualização e Filtros
    const [activeView, setActiveView] = useState<ActiveViewType>('ambiente');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilterType>('todas');
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Estados do Formulário / Modal
    const [showModal, setShowModal] = useState<ModalType | null>(null);
    const [editingNode, setEditingNode] = useState<EditingNode | null>(null);
    const [nameInput, setNameInput] = useState<string>('');
    const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
    const [selectedAttributes, setSelectedAttributes] = useState<AttributeNode[]>([]);
    const [initialAttributeIds, setInitialAttributeIds] = useState<string[]>([]);
    const [isLoadingAttributes, setIsLoadingAttributes] = useState<boolean>(false);
    const [attributeLoadFailed, setAttributeLoadFailed] = useState<boolean>(false);

    const loadData = useCallback(async (silent: boolean = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const [envs, cats, prodCounts] = await Promise.all([
                fetchEnvironments(),
                fetchCategories(),
                fetchCategoryProductCounts()
            ]);

            const categoriesWithCounts: CategoryNode[] = (cats || []).map(c => ({
                ...c,
                productCount: prodCounts[c.id] || 0
            }));

            const environmentsWithCounts: EnvironmentNode[] = (envs || []).map(e => ({
                ...e,
                categoryCount: e.categories?.length || 0
            }));

            setEnvironments(environmentsWithCounts);
            setCategories(categoriesWithCounts);
        } catch (err) {
            console.error('[useCategoriesAndEnvironments] Erro ao carregar dados:', err);
            toast.error('Erro ao carregar dados.');
        } finally {
            if (!silent) setLoading(false);
            else setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const closeForm = useCallback(() => {
        setShowModal(null);
        setEditingNode(null);
        setNameInput('');
        setSelectedLinks([]);
        setSelectedAttributes([]);
        setInitialAttributeIds([]);
        setIsLoadingAttributes(false);
        setAttributeLoadFailed(false);
    }, []);

    const handleSave = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const name = nameInput.trim().toUpperCase();
        if (!name) {
            toast.error('O nome não pode estar vazio.');
            return;
        }

        const isEnv = showModal === 'ambiente';
        if (!isEnv && (isLoadingAttributes || attributeLoadFailed)) {
            toast.error('Aguarde o carregamento dos atributos obrigatórios antes de salvar.');
            return;
        }

        const duplicate = isEnv
            ? environments.find(e => e.name.trim().toUpperCase() === name && e.id !== editingNode?.id)
            : categories.find(c => c.name.trim().toUpperCase() === name && c.id !== editingNode?.id);

        if (duplicate) {
            toast.error(`Já existe um ${isEnv ? 'Ambiente' : 'Categoria'} com o nome "${name}".`);
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingNode?.id) {
                if (isEnv) {
                    await updateEnvironment(editingNode.id, name, selectedLinks);
                } else {
                    const attributeIds = selectedAttributes.map(a => a.id);
                    await updateCategory(editingNode.id, name, selectedLinks, attributeIds);
                }
                toast.success(isEnv ? 'Ambiente atualizado!' : 'Categoria atualizada!');
            } else {
                if (isEnv) {
                    await createEnvironment(name, selectedLinks);
                } else {
                    const attributeIds = selectedAttributes.map(a => a.id);
                    await createCategory(name, selectedLinks, attributeIds, { meta_title: `${name} | Móveis Morante` });
                }
                toast.success(isEnv ? 'Ambiente criado!' : 'Categoria criada!');
            }
            closeForm();
            await loadData(true);
        } catch (err) {
            console.error('[useCategoriesAndEnvironments] Erro ao salvar:', err);
            toast.error('Erro ao salvar.');
        } finally {
            setIsSubmitting(false);
        }
    }, [nameInput, showModal, environments, categories, editingNode, selectedLinks, selectedAttributes, isLoadingAttributes, attributeLoadFailed, closeForm, loadData]);

    const handleDelete = useCallback(async (id: string, isEnv: boolean) => {
        const itemLabel = isEnv ? 'este ambiente' : 'esta categoria';
        if (!window.confirm(`Deseja EXCLUIR permanentemente ${itemLabel} do sistema?`)) {
            return;
        }

        try {
            if (isEnv) {
                await deleteEnvironment(id);
            } else {
                await deleteCategory(id);
            }
            toast.success(isEnv ? 'Ambiente excluído com sucesso!' : 'Categoria excluída com sucesso!');
            await loadData(true);
        } catch (err) {
            console.error('[useCategoriesAndEnvironments] Erro ao excluir:', err);
            toast.error(err instanceof Error ? err.message : 'Erro ao excluir.');
        }
    }, [loadData]);

    const handleUnlink = useCallback(async (envId: string, catId: string) => {
        try {
            await unlinkCategoryFromEnvironment(envId, catId);
            toast.success('Categoria desvinculada do ambiente com sucesso!');
            await loadData(true);
        } catch (err) {
            console.error('[useCategoriesAndEnvironments] Erro ao desvincular:', err);
            toast.error('Erro ao desvincular categoria do ambiente.');
        }
    }, [loadData]);

    const openEditEnvironment = useCallback((env: EnvironmentNode) => {
        setEditingNode({ id: env.id, type: 'ambiente' });
        setNameInput(env.name);
        setSelectedLinks(env.categories || []);
        setShowModal('ambiente');
    }, []);

    const openEditCategory = useCallback(async (cat: CategoryNode) => {
        setEditingNode({ id: cat.id, type: 'categoria' });
        setNameInput(cat.name);
        setSelectedLinks(cat.parents || []);
        setSelectedAttributes([]); // reseta enquanto carrega
        setInitialAttributeIds([]);
        setAttributeLoadFailed(false);
        setIsLoadingAttributes(true);
        setShowModal('categoria');

        try {
            const attrs = await fetchCategoryRequiredAttributes(cat.id);
            setSelectedAttributes(attrs);
            setInitialAttributeIds(attrs.map(attr => attr.id));
        } catch (err) {
            console.error('Erro ao buscar atributos:', err);
            setAttributeLoadFailed(true);
            toast.error('Não foi possível carregar os atributos obrigatórios desta categoria.');
        } finally {
            setIsLoadingAttributes(false);
        }
    }, []);

    const openNewEnvironment = useCallback(() => {
        setEditingNode(null);
        setNameInput('');
        setSelectedLinks([]);
        setShowModal('ambiente');
    }, []);

    const openNewCategory = useCallback((preSelectedEnvId?: string) => {
        setEditingNode(null);
        setNameInput('');
        setSelectedLinks(preSelectedEnvId ? [preSelectedEnvId] : []);
        setSelectedAttributes([]);
        setInitialAttributeIds([]);
        setAttributeLoadFailed(false);
        setIsLoadingAttributes(false);
        setShowModal('categoria');
    }, []);

    const toggleLink = useCallback((id: string) => {
        setSelectedLinks(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    }, []);

    // Atalho para mudar a aba para Categorias e filtrar por Órfãs
    const handleViewOrphans = useCallback(() => {
        setActiveView('categoria');
        setCategoryFilter('sem_ambiente');
    }, []);

    // Métricas calculadas
    const totalEnvironments = environments.length;
    const totalCategories = categories.length;
    const totalOrphans = useMemo(() => {
        return categories.filter(c => !c.parents || c.parents.length === 0).length;
    }, [categories]);
    const totalWithEnvironment = totalCategories - totalOrphans;
    const hasAddedRequiredAttributes = selectedAttributes.some(attr => !initialAttributeIds.includes(attr.id));

    return {
        environments,
        categories,
        loading,
        refreshing,
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
        // Visualização, Filtros e Métricas
        activeView,
        setActiveView,
        categoryFilter,
        setCategoryFilter,
        searchTerm,
        setSearchTerm,
        handleViewOrphans,
        totalEnvironments,
        totalCategories,
        totalOrphans,
        totalWithEnvironment
    };
}
