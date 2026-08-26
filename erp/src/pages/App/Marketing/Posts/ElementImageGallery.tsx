type Props = {
  title: string;
  images: string[];
  activeImage: string;
  aspectRatio?: string;
  onSelect: (image: string) => void;
  onAdd: () => void;
};

export default function ElementImageGallery({ title, images, activeImage, aspectRatio, onSelect, onAdd }: Props) {
  return <section className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
    <div className="mb-2 flex items-center justify-between gap-2"><p className="text-[10px] font-black text-slate-600 dark:text-slate-200">{title}</p><button type="button" onClick={onAdd} className="rounded-md bg-blue-600 px-2 py-1 text-[9px] font-black text-white"><i className="bi bi-plus-lg mr-1" />Adicionar</button></div>
    <div className="grid grid-cols-2 gap-2">
      {images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => onSelect(image)} style={aspectRatio ? { aspectRatio } : undefined} className={`overflow-hidden rounded-lg border-2 bg-slate-50 p-1 ${image === activeImage ? 'border-blue-600' : 'border-transparent hover:border-blue-200'}`}>
        <img src={image} alt={`${title} ${index + 1}`} className="h-full w-full object-contain" />
      </button>)}
      {!images.length && <p className="col-span-2 py-2 text-center text-[10px] font-bold text-slate-400">Nenhuma imagem adicionada.</p>}
    </div>
  </section>;
}
