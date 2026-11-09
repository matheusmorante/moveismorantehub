import { ArrowLeft, X } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './newGoodsReceiptModal.styles';

interface ReceiptHeaderProps {
  stage: 'source' | 'invoice' | 'purchase' | 'form';
  isExistingReceipt: boolean;
  originKind: 'manual' | 'purchase' | 'invoice';
  originInvoiceNumber?: string;
  existingInvoiceNumber?: unknown;
  saving: boolean;
  onBackToSources: () => Promise<void>;
  onRequestClose: () => Promise<void>;
}

export const ReceiptHeader: React.FC<ReceiptHeaderProps> = ({
  stage,
  isExistingReceipt,
  originKind,
  originInvoiceNumber,
  existingInvoiceNumber,
  saving,
  onBackToSources,
  onRequestClose,
}) => (
  <View style={[styles.header, { backgroundColor: '#059669' }]}>
    {stage === 'form' && !isExistingReceipt && (
      <TouchableOpacity
        onPress={() => void onBackToSources()}
        disabled={saving}
        accessibilityLabel="Voltar aos tipos de recebimento"
      >
        <ArrowLeft size={22} color="#ffffff" />
      </TouchableOpacity>
    )}
    <View style={styles.headerCopy}>
      <Text style={styles.headerTitle}>Cadastro do recebimento de mercadoria</Text>
      <Text style={styles.headerSubtitle}>
        {stage === 'source'
          ? 'Escolha a origem'
          : stage === 'invoice'
            ? 'Selecione a nota fiscal'
            : stage === 'purchase'
              ? 'Selecione o pedido de compra'
              : originKind === 'invoice' || existingInvoiceNumber
                ? `NF-e #${originInvoiceNumber || existingInvoiceNumber || '—'}`
                : originKind === 'purchase'
                  ? 'Pedido de compra'
                  : 'Sem nota fiscal'}
      </Text>
    </View>
    <TouchableOpacity onPress={onRequestClose} disabled={saving} accessibilityLabel="Fechar">
      <X size={24} color="#ffffff" />
    </TouchableOpacity>
  </View>
);
