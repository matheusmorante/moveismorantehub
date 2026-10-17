import React from 'react';

interface MediaLightboxModalProps {
  isOpen: boolean;
  mediaUrl: string | null;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  isOpen,
  mediaUrl,
  onClose,
}) => {
  if (!isOpen || !mediaUrl) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
    >
      <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
        <img
          src={mediaUrl}
          alt="Visualização da imagem em tamanho original"
          className="max-h-[85vh] w-auto object-contain rounded-2xl shadow-2xl"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
          title="Fechar"
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>
    </div>
  );
};
