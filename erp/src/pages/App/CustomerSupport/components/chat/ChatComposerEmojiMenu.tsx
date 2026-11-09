import React from 'react';

export const COMPOSER_EMOJIS = ['😀', '😊', '😍', '👍', '🙏', '❤️', '✨', '😉', '🎉', '👋', '😄', '🛋️'];

interface ChatComposerEmojiMenuProps {
  isOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onSelectEmoji: (emoji: string) => void;
}

export const ChatComposerEmojiMenu: React.FC<ChatComposerEmojiMenuProps> = ({
  isOpen,
  menuRef,
  onSelectEmoji,
}) => {
  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 mb-2 p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl grid grid-cols-4 gap-1 z-30"
    >
      {COMPOSER_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelectEmoji(emoji)}
          className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-lg flex items-center justify-center transition-colors cursor-pointer"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};
