import { useState, useRef, useEffect } from 'react';

export function useComposerMenusState() {
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isEmojiMenuOpen, setIsEmojiMenuOpen] = useState(false);
  const attachmentMenuRef = useRef<HTMLDivElement | null>(null);
  const emojiMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAttachmentMenuOpen && !isEmojiMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!attachmentMenuRef.current?.contains(target)) {
        setIsAttachmentMenuOpen(false);
      }
      if (!emojiMenuRef.current?.contains(target)) {
        setIsEmojiMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAttachmentMenuOpen(false);
        setIsEmojiMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isAttachmentMenuOpen, isEmojiMenuOpen]);

  return {
    isAttachmentMenuOpen,
    setIsAttachmentMenuOpen,
    isEmojiMenuOpen,
    setIsEmojiMenuOpen,
    attachmentMenuRef,
    emojiMenuRef,
  };
}
