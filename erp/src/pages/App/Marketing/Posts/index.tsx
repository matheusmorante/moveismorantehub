import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { PostCanvas } from './components/Editor/PostCanvas';
import { usePostEditor } from './components/Editor/usePostEditor';
import { exportPostImage } from './services/exportPostImage';
import { generateRoom } from './services/compositionAi';
import { buildImagePrompt } from './services/postTemplatePrompt';
import { postTemplateService } from './services/postTemplateService';
import { PostTemplate } from './types/postTemplate';
import { ModelFormModal } from './components/ModelFormModal';
import { TemplateGrid } from './components/TemplateGrid';
import { DeleteTemplateModal } from './components/DeleteTemplateModal';

const ratio = (template: PostTemplate) => template.aspectRatio;

export default function MarketingPostsManager() {
  const editor = usePostEditor();
  const [templates, setTemplates] = useState<PostTemplate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [generatedImage, setGeneratedImage] = useState<string>();
  const [busy, setBusy] = useState('');
  const [admin, setAdmin] = useState(true);

  const [editingModel, setEditingModel] = useState<PostTemplate | undefined>();
  const [modelFormOpen, setModelFormOpen] = useState(false);

  const [templateToDelete, setTemplateToDelete] = useState<PostTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selected = templates.find((template) => template.id === selectedId);

  const loadTemplates = async () => {
    const items = await postTemplateService.list();
    setTemplates(items);
    if (!selectedId && items[0]?.id) {
      setSelectedId(items[0].id);
    }
    return items;
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  useEffect(() => {
    if (!selected || !editor.data) return;
    setValues((current) =>
      Object.fromEntries(
        selected.fields.map((field) => [
          field.key,
          current[field.key] ??
            (field.source === 'name'
              ? editor.data!.name
              : field.source === 'price'
              ? editor.data!.price
              : field.source === 'oldPrice'
              ? editor.data!.oldPrice || ''
              : field.key === 'installment'
              ? 'Em até 10x sem juros'
              : ''),
        ])
      )
    );
  }, [selectedId, editor.data?.name]);

  const preview = useMemo(
    () =>
      editor.data && selected
        ? {
            ...editor.data,
            name: values.title || editor.data.name,
            price: values.price || editor.data.price,
            oldPrice: values.oldPrice || editor.data.oldPrice,
            installmentValue: values.installment || 'Em até 10x sem juros',
            mainImageUrl: generatedImage || editor.data.mainImageUrl,
          }
        : null,
    [editor.data, selected, values, generatedImage]
  );

  const handleDuplicate = async (template: PostTemplate) => {
    try {
      const copy = await postTemplateService.save({
        ...template,
        id: undefined,
        name: `${template.name} — Cópia`,
        slug: `${template.slug}-copia`,
      });
      const items = await loadTemplates();
      setSelectedId(copy.id);
      toast.success('Modelo duplicado com sucesso!');
    } catch {
      toast.error('Erro ao duplicar modelo.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    try {
      await postTemplateService.remove(templateToDelete.id);
      const items = await postTemplateService.list();
      setTemplates(items);
      if (selectedId === templateToDelete.id) {
        setSelectedId(items[0]?.id || '');
      }
      toast.success(`Modelo "${templateToDelete.name}" excluído com sucesso.`);
      setTemplateToDelete(null);
    } catch {
      toast.error('Erro ao excluir modelo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const generate = async () => {
    if (!selected || !preview || !editor.product) return;
    setBusy('Gerando imagem visual…');
    try {
      const prompt = buildImagePrompt(selected, {
        'product.name': editor.product.name || '',
        'product.description': editor.product.description || '',
        'product.category': editor.product.category || '',
        'template.aspectRatio': selected.aspectRatio,
      });
      const image = selected.imageRules.generateEnvironment
        ? await generateRoom(preview.mainImageUrl, preview.name, '#24170e', prompt, selected.aspectRatio)
        : preview.mainImageUrl;
      setGeneratedImage(image);
    } finally {
      setBusy('');
    }
  };

  if (admin) {
    return (
      <section className="min-h-screen bg-slate-950 p-6 text-white">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-xl font-bold text-white">Modelos para Posts</h1>
            <p className="text-xs text-slate-400">
              Crie modelos reutilizáveis com instruções, referências e arquivos para geração de posts.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingModel(undefined);
                setModelFormOpen(true);
              }}
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              + Novo modelo
            </button>
            <button
              type="button"
              onClick={() => setAdmin(false)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Gerar post
            </button>
          </div>
        </header>

        <TemplateGrid
          templates={templates}
          onEdit={(template) => {
            setEditingModel(template);
            setModelFormOpen(true);
          }}
          onDuplicate={handleDuplicate}
          onDeleteRequest={(template) => setTemplateToDelete(template)}
        />

        {modelFormOpen && (
          <ModelFormModal
            value={editingModel}
            onClose={() => setModelFormOpen(false)}
            onSave={async (model) => {
              const saved = await postTemplateService.save(model);
              await loadTemplates();
              setSelectedId(saved.id);
            }}
          />
        )}

        {templateToDelete && (
          <DeleteTemplateModal
            template={templateToDelete}
            isDeleting={isDeleting}
            onClose={() => setTemplateToDelete(null)}
            onConfirm={handleConfirmDelete}
          />
        )}
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-slate-950 text-white">
      <header className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
        <div>
          <b>Criar post</b>
          <span className="ml-2 text-xs text-slate-400">Produto + modelo + campos</span>
        </div>
        <button
          type="button"
          onClick={() => setAdmin(true)}
          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          ← Administrar modelos
        </button>
      </header>

      <div className="grid min-h-[calc(100vh-56px)] grid-cols-1 lg:grid-cols-2">
        <form
          className="space-y-4 border-r border-slate-800 p-5 overflow-y-auto"
          onSubmit={(e) => {
            e.preventDefault();
            void generate();
          }}
        >
          <label className="block text-xs font-medium text-slate-300">
            Produto
            <input
              className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-sm text-white"
              placeholder="Buscar produto"
              value={editor.search}
              onChange={(e) => editor.setSearch(e.target.value)}
            />
          </label>

          <select
            className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-sm text-white"
            value={editor.product?.id || ''}
            onChange={(e) => void editor.selectProduct(e.target.value)}
          >
            <option value="">Selecionar produto</option>
            {editor.products
              .filter((p) => p.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.title}
                </option>
              ))}
          </select>

          <label className="block text-xs font-medium text-slate-300">
            Modelo
            <select
              className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-sm text-white"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setGeneratedImage(undefined);
              }}
            >
              <option value="">Selecionar modelo</option>
              {templates
                .filter((t) => t.status === 'ACTIVE')
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.aspectRatio}
                  </option>
                ))}
            </select>
          </label>

          {selected?.fields.map((field) => (
            <label key={field.key} className="block text-xs font-medium text-slate-300">
              {field.label}
              {field.required && ' *'}
              <input
                required={field.required}
                maxLength={field.maxLength}
                className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 p-2 text-sm text-white"
                value={values[field.key] || ''}
                onChange={(e) =>
                  setValues((current) => ({ ...current, [field.key]: e.target.value }))
                }
              />
            </label>
          ))}

          <button
            type="submit"
            disabled={!preview || !selected || !!busy}
            className="w-full rounded-lg bg-indigo-600 p-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {busy || 'Gerar imagem'}
          </button>
        </form>

        <main className="flex min-h-0 flex-col items-center justify-center bg-slate-900/30 p-5">
          {preview && selected ? (
            <>
              <PostCanvas
                aspectRatio={ratio(selected)}
                layers={selected.layout}
                product={preview}
                backgroundColor="#24170e"
              />
              <button
                type="button"
                onClick={async () => {
                  const canvas = document.getElementById('marketing-post-canvas');
                  if (canvas) {
                    const image = await exportPostImage(canvas);
                    const link = document.createElement('a');
                    link.href = image.toDataURL('image/png');
                    link.download = 'post.png';
                    link.click();
                  }
                }}
                className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
              >
                Exportar PNG
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-400">Selecione produto e modelo para visualizar.</p>
          )}
        </main>
      </div>
    </section>
  );
}
