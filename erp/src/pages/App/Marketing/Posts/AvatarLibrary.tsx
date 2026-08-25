type AvatarItem = { id: string; name: string; url: string };

type Props = {
  avatars: AvatarItem[];
  open: boolean;
  onToggle: () => void;
  onSelect: (avatar: AvatarItem) => void;
  onDelete: (avatar: AvatarItem) => void;
};

export default function AvatarLibrary({ avatars, open, onToggle, onSelect, onDelete }: Props) {
  return <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20">
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 p-3 text-left text-[10px] font-black text-blue-800 dark:text-blue-300">
      <i className="bi bi-person-bounding-box" /> Avatares
      <i className={`bi bi-chevron-${open ? 'up' : 'down'} ml-auto`} />
    </button>
    {open && <div className="grid grid-cols-2 gap-2 px-2 pb-2">
      {avatars.map(avatar => <div key={avatar.id} className="group relative overflow-hidden rounded-lg border border-blue-100 bg-white dark:border-slate-700 dark:bg-slate-900">
        <button type="button" onClick={() => onSelect(avatar)} title={`Usar ${avatar.name}`} className="block aspect-square w-full p-1">
          <img src={avatar.url} alt={avatar.name} className="h-full w-full object-contain" />
        </button>
        <button type="button" onClick={() => onDelete(avatar)} title={`Excluir ${avatar.name}`} aria-label={`Excluir ${avatar.name}`} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-red-600 text-white opacity-0 shadow transition-opacity hover:bg-red-700 group-hover:opacity-100 focus:opacity-100">
          <i className="bi bi-trash3-fill text-[10px]" />
        </button>
      </div>)}
      {avatars.length === 0 && <p className="col-span-2 py-3 text-center text-[10px] font-bold text-slate-400">Nenhum avatar.</p>}
    </div>}
  </div>;
}
