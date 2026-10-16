'use client';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { catalogSelectionFormSchema, categoryEnvironmentFormSchema } from '@/shared-utils/catalogFormSchemas';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2, LayoutGrid, ListTree } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

type CategoryItem = { id: string; name: string; slug: string; type: string };
type CategoryLink = { parent_id: string; child_id: string };

interface CategoriesManagerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<void>;
}

export function CategoriesManagerModal({
  isOpen,
  onOpenChange,
  onSuccess,
}: CategoriesManagerModalProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [relationships, setRelationships] = useState<CategoryLink[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditingDialogOpen, setIsEditingDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'category',
    linkedIds: [] as string[],
  });
  const form = useZodForm(categoryEnvironmentFormSchema, formData);
  const deleteForm = useZodForm(catalogSelectionFormSchema, { id: '' });
  const [isAutoSlug, setIsAutoSlug] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dataReady, setDataReady] = useState(false);
  const busy = useRef(false);
  const uncertain = useRef(false);
  const mounted = useRef(true);
  const querySequence = useRef(0);
  const { user, loading: authLoading } = useAuth();
  const context = useRef({ isOpen, userId: user?.id, generation: 0 });
  useLayoutEffect(() => {
    if (context.current.isOpen !== isOpen || context.current.userId !== user?.id) {
      context.current = { isOpen, userId: user?.id, generation: context.current.generation + 1 };
    }
  }, [isOpen, user?.id]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const isCurrent = (generation: number) => mounted.current && context.current.isOpen && context.current.generation === generation;
  const showError = (error: unknown, generation = context.current.generation) => {
    if (!isCurrent(generation)) return;
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Não foi possível confirmar a operação.';
    setErrorMessage(message);
    toast.error(message);
  };
  const request = async <T,>(query: PromiseLike<T>, generation: number, mutation = false): Promise<T> => {
    if (!isCurrent(generation)) throw new Error('A sessão ou o catálogo mudou. Reabra o gerenciamento.');
    let result: T | null;
    try { result = await withTimeout(query, 20_000, null, 'Gerenciamento de categorias'); }
    catch (error) { if (mutation) uncertain.current = true; throw error; }
    if (result === null) {
      if (mutation) uncertain.current = true;
      throw new Error(mutation ? 'A gravação não foi confirmada. Confira os cadastros e recarregue a página antes de repetir.' : 'O carregamento demorou demais. Tente novamente.');
    }
    if (!isCurrent(generation)) throw new Error('A sessão ou o catálogo mudou. Reabra o gerenciamento.');
    return result;
  };

  useEffect(() => {
    if (isOpen && !authLoading && user) void fetchData();
    // Reload belongs to the modal/account; local edits do not replace its draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, authLoading, user?.id]);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
      .trim()
      .replace(/\s+/g, '-') // Espaços para -
      .replace(/-+/g, '-'); // Remove duplicados de -
  };

  async function fetchData(generation = context.current.generation) {
    const sequence = ++querySequence.current;
    setLoading(true);
    setDataReady(false);
    try {
      const [catRes, relRes] = await Promise.all([
        request(supabase.from('categories').select('*').order('name'), generation),
        request(supabase.from('category_relationships').select('*'), generation),
      ]);
      if (!isCurrent(generation) || querySequence.current !== sequence) return false;
      if (catRes.error) throw catRes.error;
      if (relRes.error) throw relRes.error;
      if (!Array.isArray(catRes.data) || !Array.isArray(relRes.data)) throw new Error('O carregamento das categorias não foi confirmado.');
      setCategories(catRes.data || []);
      setRelationships(relRes.data || []);
      setDataReady(true);
      return true;
    } catch (error) { if (querySequence.current === sequence) showError(error, generation); return false; }
    finally { if (isCurrent(generation) && querySequence.current === sequence) setLoading(false); }
  }

  const startOperation = () => {
    if (busy.current) return false;
    if (uncertain.current) { showError(new Error('Há uma gravação sem confirmação. Confira os cadastros e recarregue a página.')); return false; }
    if (!dataReady || authLoading || !user) { showError(new Error('Aguarde o carregamento das categorias e da sessão.')); return false; }
    busy.current = true;
    setIsSaving(true);
    setErrorMessage('');
    return true;
  };
  const finishOperation = () => {
    busy.current = false;
    if (mounted.current) setIsSaving(false);
  };
  const refreshOwner = async (generation: number) => {
    await fetchData(generation);
    if (isCurrent(generation) && onSuccess) {
      const notified = await withTimeout(Promise.resolve(onSuccess()).then(() => true), 20_000, false, 'Atualização das categorias no produto');
      if (!notified) showError(new Error('Cadastro salvo, mas a atualização do produto demorou demais. Reabra o produto.'), generation);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startOperation()) return;
    const generation = context.current.generation;
    try {
      await form.validateAndRun(formData, async (validated) => {
      if (!isCurrent(generation)) return;
      let itemId = currentCategory?.id;
      const itemData = { name: validated.name, slug: validated.slug, type: validated.type };
      const saved = itemId ? await request(supabase
          .from('categories')
          .update(itemData)
          .eq('id', itemId).select(), generation, true)
        : await request(supabase.from('categories').insert([itemData]).select(), generation, true);
      if (saved.error) throw saved.error;
      if (saved.data?.length !== 1 || !saved.data[0].id || (itemId && saved.data[0].id !== itemId) || saved.data[0].name !== itemData.name || saved.data[0].slug !== itemData.slug || saved.data[0].type !== itemData.type) {
        uncertain.current = true;
        throw new Error('O cadastro não devolveu confirmação dos dados. Confira e recarregue a página antes de repetir.');
      }
      itemId = saved.data[0].id;
      setCurrentCategory(saved.data[0]); // A confirmed create must not be inserted again after a link failure.
      for (const key of ['child_id', 'parent_id'] as const) {
        const removed = await request(supabase.from('category_relationships').delete().eq(key, itemId).select('parent_id,child_id'), generation, true);
        if (removed.error) throw removed.error;
        if (!Array.isArray(removed.data) || removed.data.some((row) => row[key] !== itemId)) throw new Error('A remoção dos vínculos anteriores não foi confirmada.');
      }
      const newRels = [...new Set(validated.linkedIds)].map((id) => validated.type === 'category' ? { parent_id: id, child_id: itemId! } : { parent_id: itemId!, child_id: id });
      if (newRels.length) {
        const linked = await request(supabase.from('category_relationships').insert(newRels).select('parent_id,child_id'), generation, true);
        if (linked.error) throw linked.error;
        if (linked.data?.length !== newRels.length || newRels.some((expected) => !linked.data.some((row) => row.parent_id === expected.parent_id && row.child_id === expected.child_id))) throw new Error('Os vínculos selecionados não foram confirmados.');
      }
      await refreshOwner(generation);
      if (!isCurrent(generation)) return;
      setIsEditingDialogOpen(false);
      toast.success('Salvo com sucesso!');
      }, (errors) => showError(new Error(Object.values(flattenFormErrors(errors))[0]), generation));
    } catch (error) { showError(error, generation); }
    finally { finishOperation(); }
  };

  const handleDelete = async (id: string) => {
    if (!startOperation()) return;
    const generation = context.current.generation;
    try {
      await deleteForm.validateAndRun({ id }, async (values) => {
        if (!isCurrent(generation) || !categories.some((category) => category.id === values.id)) throw new Error('O item selecionado não está mais disponível. Atualize a lista.');
        if (!confirm('Excluir este item?')) return;
        const { data, error } = await request(supabase.from('categories').delete().eq('id', values.id).select('id'), generation, true);
        if (error) throw error;
        if (data?.length !== 1 || data[0].id !== values.id) throw new Error('A exclusão do item não foi confirmada.');
        await refreshOwner(generation);
        if (isCurrent(generation)) toast.success('Excluído!');
      }, (errors) => showError(new Error(Object.values(flattenFormErrors(errors))[0]), generation));
    } catch (error) { showError(error, generation); }
    finally { finishOperation(); }
  };

  const openEditDialog = (category: CategoryItem | null = null, defaultType: string = 'category') => {
    if (busy.current || !dataReady || uncertain.current) return;
    setCurrentCategory(category);
    const type = category?.type || defaultType;
    setIsAutoSlug(!category); // Auto slug ativo apenas para novos por padrão

    const linkedIds = category
      ? relationships
          .filter((r) =>
            type === 'category' ? r.child_id === category.id : r.parent_id === category.id
          )
          .map((r) => (type === 'category' ? r.parent_id : r.child_id))
      : [];

    setFormData({
      name: category?.name || '',
      slug: category?.slug || '',
      type: type,
      linkedIds: linkedIds,
    });
    setIsEditingDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    const newSlug = isAutoSlug ? generateSlug(name) : formData.slug;
    setFormData({ ...formData, name, slug: newSlug });
  };

  const environments = categories.filter((c) => c.type === 'environment');
  const productCategories = categories.filter((c) => c.type === 'category');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!busy.current) onOpenChange(open); }}>
      <DialogContent className="max-w-6xl w-[95vw] md:w-full max-h-[90vh] md:max-h-[85vh] p-4 sm:p-6 md:p-8 overflow-y-auto rounded-2xl md:rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            Gerenciar Ambientes e Categorias
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Adicione, edite ou exclua os ambientes e categorias da loja. Suas alterações refletirão
            na seleção de categorias do produto imediatamente.
          </DialogDescription>
        </DialogHeader>
        {errorMessage && !isEditingDialogOpen && <p role="alert" className="text-sm text-red-700">{errorMessage}</p>}
        {isSaving && !isEditingDialogOpen && <p role="status" className="flex items-center gap-2 text-sm text-primary"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Confirmando alterações nas categorias...</p>}
        {!loading && !dataReady && <Button type="button" disabled={isSaving} onClick={() => { void fetchData(); }}>Tentar carregar novamente</Button>}

        <div className="space-y-6 my-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AMBIENTES */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-gray-700">
                  <LayoutGrid className="h-4.5 w-4.5 text-primary" />
                  Ambientes
                </h3>
                <Button
                  disabled={isSaving || loading || !dataReady}
                  size="sm"
                  onClick={() => openEditDialog(null, 'environment')}
                  className="h-8 text-xs font-bold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Novo Ambiente
                </Button>
              </div>
              <CategoryListTable
                data={environments}
                onEdit={(c) => openEditDialog(c)}
                onDelete={handleDelete}
                loading={loading}
                disabled={isSaving || !dataReady}
                categories={categories}
                relationships={relationships}
                isEnv
              />
            </div>

            {/* CATEGORIAS */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-gray-700">
                  <ListTree className="h-4.5 w-4.5 text-primary" />
                  Categorias
                </h3>
                <Button
                  disabled={isSaving || loading || !dataReady}
                  size="sm"
                  onClick={() => openEditDialog(null, 'category')}
                  className="h-8 text-xs font-bold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Nova Categoria
                </Button>
              </div>
              <CategoryListTable
                data={productCategories}
                onEdit={(c) => openEditDialog(c)}
                onDelete={handleDelete}
                loading={loading}
                disabled={isSaving || !dataReady}
                categories={categories}
                relationships={relationships}
              />
            </div>
          </div>
        </div>

        {/* MODAL DE CRIAÇÃO/EDIÇÃO DETALHADA */}
        <Dialog open={isEditingDialogOpen} onOpenChange={(open) => { if (!busy.current) setIsEditingDialogOpen(open); }}>
          <DialogContent className="sm:max-w-md rounded-2xl z-[100]">
            <form noValidate onSubmit={handleSave}>
              <fieldset disabled={isSaving}>
              <DialogHeader>
                <DialogTitle className="text-base font-bold">
                  {currentCategory ? 'Editar Item' : 'Novo Item'}
                </DialogTitle>
              </DialogHeader>
              {errorMessage && <p role="alert" className="text-sm text-red-700">{errorMessage}</p>}
              {isSaving && <p role="status" className="flex items-center gap-2 text-sm text-primary"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Confirmando alterações nas categorias...</p>}
              <div className="space-y-4 py-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Tipo</label>
                  <Select
                    aria-label="Tipo do cadastro"
                    value={formData.type}
                    onValueChange={(val) => setFormData({ ...formData, type: val, linkedIds: [] })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="environment">Ambiente</SelectItem>
                      <SelectItem value="category">Categoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">
                    {formData.type === 'category'
                      ? 'Vincular a Ambientes'
                      : 'Vincular a Categorias'}
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl border max-h-36 overflow-y-auto">
                    {(formData.type === 'category' ? environments : productCategories).map(
                      (item) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`modal-link-${item.id}`}
                            checked={formData.linkedIds.includes(item.id)}
                            onCheckedChange={(checked) => {
                              if (checked)
                                setFormData({
                                  ...formData,
                                  linkedIds: [...formData.linkedIds, item.id],
                                });
                              else
                                setFormData({
                                  ...formData,
                                  linkedIds: formData.linkedIds.filter((id) => id !== item.id),
                                });
                            }}
                          />
                          <label
                            htmlFor={`modal-link-${item.id}`}
                            className="text-xs font-medium leading-none cursor-pointer capitalize"
                          >
                            {item.name}
                          </label>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Nome</label>
                  <Input
                    aria-label="Nome do cadastro"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="h-10"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-700">Slug (URL)</label>
                    <button
                      type="button"
                      onClick={() => setIsAutoSlug(!isAutoSlug)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-colors flex items-center gap-0.5 ${
                        isAutoSlug
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {isAutoSlug ? 'Automático' : 'Manual'}
                    </button>
                  </div>
                  <Input
                    aria-label="Endereço do cadastro"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slug: e.target.value.toLowerCase().replace(/ /g, '-'),
                      })
                    }
                    className="h-10 bg-gray-50/50"
                    required
                    readOnly={isAutoSlug}
                  />
                </div>
              </div>
              <DialogFooter className="gap-1.5 pt-2">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" size="sm" disabled={isSaving}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" size="sm" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Salvar
                </Button>
              </DialogFooter>
              </fieldset>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function CategoryListTable({
  data,
  onEdit,
  onDelete,
  loading,
  disabled,
  categories,
  relationships,
  isEnv,
}: {
  data: CategoryItem[]; onEdit: (category: CategoryItem) => void; onDelete: (id: string) => void;
  loading: boolean; disabled: boolean; categories: CategoryItem[]; relationships: CategoryLink[]; isEnv?: boolean;
}) {
  if (loading)
    return (
      <div className="p-6 text-center bg-white rounded-xl border">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  if (data.length === 0)
    return (
      <div className="p-6 text-center bg-white rounded-xl border text-muted-foreground text-xs italic">
        Nenhum item cadastrado.
      </div>
    );

  return (
    <div className="bg-white rounded-xl border overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar">
      <Table>
        <TableHeader className="bg-gray-50 sticky top-0 z-10">
          <TableRow>
            <TableHead className="font-bold text-xs py-2">Nome</TableHead>
            <TableHead className="font-bold text-xs py-2">
              {isEnv ? 'Filhos' : 'Ambientes'}
            </TableHead>
            <TableHead className="font-bold text-xs py-2 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const rels = isEnv
              ? relationships.filter((r) => r.parent_id === item.id)
              : relationships.filter((r) => r.child_id === item.id);

            const relatedNames = rels
              .map((r) => {
                const target = categories.find(
                  (c) => c.id === (isEnv ? r.child_id : r.parent_id)
                );
                return target?.name;
              })
              .filter((name): name is string => Boolean(name));

            return (
              <TableRow key={item.id} className="hover:bg-gray-50/50">
                <TableCell className="font-medium text-gray-700 capitalize text-xs py-2">
                  {item.name}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex flex-wrap gap-0.5">
                    {relatedNames.length > 0 ? (
                      relatedNames.map((name: string, i: number) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-[9px] bg-primary/5 text-primary border-none capitalize py-0 px-1"
                        >
                          {name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[9px] text-muted-foreground italic">Nenhum</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right py-1.5 space-x-0.5">
                  <Button
                    disabled={disabled}
                    aria-label={`Editar ${item.name}`}
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(item)}
                    className="h-7 w-7 text-blue-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    disabled={disabled}
                    aria-label={`Excluir ${item.name}`}
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(item.id)}
                    className="h-7 w-7 text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
