import React from 'react';
import { StockMove } from '../../../types/stock.types';
import { StockMoveCardContent } from './StockMoveCardContent';

export interface StockMoveCardProps {
  move: StockMove;
  isDarkMode: boolean;
}

export const StockMoveCard: React.FC<StockMoveCardProps> = (props) => {
  return <StockMoveCardContent {...props} />;
};

export default StockMoveCard;
