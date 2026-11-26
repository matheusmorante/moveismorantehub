import React from 'react';

interface SaveButtonProps {
  onClick: () => void;
}

const SaveButton: React.FC<SaveButtonProps> = ({ onClick }) => {
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] animate-slide-up">
      <button
        onClick={onClick}
        className="bg-slate-900 dark:bg-blue-600 hover:scale-110 active:scale-95 text-white px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(37,99,235,0.3)] flex items-center gap-4 transition-all group"
      >
        <div className="relative">
          <i className="bi bi-cloud-check-fill text-xl group-hover:opacity-0 transition-opacity" />
          <i className="bi bi-stars text-xl absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
        </div>
        Salvar Preferências
      </button>
    </div>
  );
};

export default SaveButton;
