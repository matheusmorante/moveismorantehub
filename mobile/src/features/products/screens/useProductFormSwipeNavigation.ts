import { useRef } from 'react';
import type { TabId } from './productFormTabs';

interface ProductFormSwipeNavigationProps {
  activeTab: TabId;
  enabledTabs: readonly { id: TabId }[];
  onTabChange: (tabId: TabId) => void;
}

export const useProductFormSwipeNavigation = ({
  activeTab,
  enabledTabs,
  onTabChange,
}: ProductFormSwipeNavigationProps) => {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = (event: any) => {
    touchStartX.current = event.nativeEvent.pageX;
    touchStartY.current = event.nativeEvent.pageY;
  };

  const handleTouchEnd = (event: any) => {
    const endX = event.nativeEvent.pageX;
    const endY = event.nativeEvent.pageY;
    const deltaX = endX - touchStartX.current;
    const deltaY = endY - touchStartY.current;

    // Se gesto for horizontal (deltaX > 60px) e pouco vertical (deltaY < 60px)
    if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 60) {
      const currentIdx = enabledTabs.findIndex((tab) => tab.id === activeTab);
      if (deltaX < 0) {
        // Deslizar para a esquerda -> Próxima aba
        if (currentIdx >= 0 && currentIdx < enabledTabs.length - 1) {
          onTabChange(enabledTabs[currentIdx + 1].id);
        }
      } else {
        // Deslizar para a direita -> Aba anterior
        if (currentIdx > 0) {
          onTabChange(enabledTabs[currentIdx - 1].id);
        }
      }
    }
  };

  return { handleTouchStart, handleTouchEnd };
};
