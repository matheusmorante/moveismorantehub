import React from 'react';
import { ProductPost, productPostFormatLabel } from '../../types/postSpecification';

interface PostCardProps {
  post: ProductPost;
  campaignName?: string;
  productName?: string;
  onDelete: (post: ProductPost) => void;
  onDownload: (post: ProductPost) => void;
}

export function PostCard({ post, campaignName, productName, onDelete, onDownload }: PostCardProps) {
  const formatLabel = productPostFormatLabel[post.format];
  const isLandscape = false; // Todos os formatos são portrait
  const datePt = new Date(post.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <article className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition hover:border-indigo-500/60 hover:shadow-lg hover:shadow-indigo-500/10">
      {/* Thumbnail */}
      <div
        className={`relative overflow-hidden bg-slate-950 ${isLandscape ? 'aspect-[4/5]' : post.format === 'STORY_STATUS_9_16' ? 'aspect-[9/16]' : 'aspect-[4/5]'}`}
      >
        <img
          src={post.image_url ?? post.imageUrl}
          alt={post.title ?? `Post ${formatLabel}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={e => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%231e293b" width="100" height="100"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-size="12">Sem imagem</text></svg>';
          }}
        />
        {/* Formato badge */}
        <span className="absolute left-2 top-2 rounded-md bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200 backdrop-blur-sm">
          {formatLabel}
        </span>
        {/* Ações ao hover */}
        <div className="absolute inset-x-0 bottom-0 flex translate-y-full gap-1 bg-gradient-to-t from-slate-950 p-2 transition-transform duration-200 group-hover:translate-y-0">
          <button
            onClick={() => onDownload(post)}
            className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-500"
          >
            ⬇ Baixar
          </button>
          <button
            onClick={() => onDelete(post)}
            className="rounded-lg bg-red-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-600"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Metadados */}
      <div className="space-y-0.5 px-3 py-2.5">
        {productName && (
          <p className="truncate text-[11px] font-semibold text-slate-200">{productName}</p>
        )}
        {campaignName && (
          <p className="truncate text-[10px] text-indigo-400">{campaignName}</p>
        )}
        <p className="text-[10px] text-slate-500">{datePt}</p>
      </div>
    </article>
  );
}
