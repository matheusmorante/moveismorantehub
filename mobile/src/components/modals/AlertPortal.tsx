import React from 'react';
import { Modal } from 'react-native';

type Props = { visible: boolean; onRequestClose: () => void; children: React.ReactNode };

export function AlertPortal({ visible, onRequestClose, children }: Props) {
  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onRequestClose}>{children}</Modal>;
}
