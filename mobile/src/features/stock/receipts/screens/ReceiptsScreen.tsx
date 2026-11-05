import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import {
  Box,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
} from 'lucide-react-native';
import { useReceipts } from '../hooks/useReceipts';
import { NewGoodsReceiptModal } from '../modals/NewGoodsReceiptModal';
import type { Invoice } from '../../types/stock.types';
import { ReceiptDetailsModal } from '../modals/ReceiptDetailsModal';
import { ReceiptMovementDetailsModal } from '../modals/ReceiptMovementDetailsModal';
import { ReceiptCard } from './ReceiptCard';
import {
  useReceiptUnreverseAvailability,
  type ReceiptUnreverseCheck,
} from '../hooks/useReceiptUnreverseAvailability';
import { styles } from './receiptsScreen.styles';
import { useMobileLabels } from '../../labels/MobileLabelsProvider';
import {
  discardMobileGoodsReceiptDraft,
  reverseMobileGoodsReceipt,
  unreverseMobileGoodsReceipt,
  fetchGoodsReceiptByFiscalKey,
} from '../../../../services/stock/stockReceiptsService';

interface Props {
  isDarkMode: boolean;
  canPrintIdentificationLabels?: boolean;
  startWithInvoice?: Invoice | null;
  onStartWithInvoiceConsumed?: () => void;
  onBack: () => void;
  renderHeader: (rightAction?: ReactNode) => React.ReactElement;
}

const isReceiptDraft = (receipt: any) => receipt?.is_draft === true || receipt?.status === 'draft';

type ReceiptActionDialog =
  | { kind: 'confirm'; action: 'discard' | 'reverse' | 'unreverse'; receipt: any }
  | { kind: 'error'; title: string; message: string };

export const ReceiptsScreen: React.FC<Props> = ({
  isDarkMode,
  canPrintIdentificationLabels = false,
  startWithInvoice = null,
  onStartWithInvoiceConsumed,
  onBack,
  renderHeader,
}) => {
  const { receipts, loading, loadingMore, loadMore, loadError, reload } = useReceipts();
  const { openLabels } = useMobileLabels();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<any> | null>(null);
  const menuAnchor = useRef<View>(null);
  const [focusedReceipt, setFocusedReceipt] = useState<any | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [selectedMovementReceipt, setSelectedMovementReceipt] = useState<any | null>(null);
  const [receiptMenu, setReceiptMenu] = useState<any | null>(null);
  const [receiptToResume, setReceiptToResume] = useState<any | null>(null);
  const [receiptToEdit, setReceiptToEdit] = useState<any | null>(null);
  const [invoiceToStart, setInvoiceToStart] = useState<Invoice | null>(startWithInvoice);
  const consumedStartInvoiceRef = useRef('');
  const [isNewReceiptOpen, setIsNewReceiptOpen] = useState(false);
  const [isReceiptActionRunning, setIsReceiptActionRunning] = useState(false);
  const [receiptActionDialog, setReceiptActionDialog] = useState<ReceiptActionDialog | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 16 });
  const [unreverseCheck, setUnreverseCheck] = useState<ReceiptUnreverseCheck | null>(null);
  useEffect(() => {
    if (!startWithInvoice || consumedStartInvoiceRef.current === startWithInvoice.id) return;
    consumedStartInvoiceRef.current = startWithInvoice.id;
    setInvoiceToStart(startWithInvoice);
    setReceiptToResume(null);
    setReceiptToEdit(null);
    setIsNewReceiptOpen(true);
    onStartWithInvoiceConsumed?.();
  }, [startWithInvoice?.id]);
  const { unreverseBlocked, unreverseReason } = useReceiptUnreverseAvailability({
    receiptMenu,
    unreverseCheck,
    setUnreverseCheck,
  });
  const receiptMenuHasLinkedProducts = Boolean(
    receiptMenu?.id &&
    receiptMenu?.items?.length &&
    receiptMenu.items.every((item: any) => Boolean(
      item?.productId || item?.product_id || item?.item_snapshot?.productId
    ))
  );
  const receiptMenuCanPrintLabels = Boolean(
    canPrintIdentificationLabels &&
    receiptMenu?.status === 'received' &&
    !isReceiptDraft(receiptMenu) &&
    receiptMenuHasLinkedProducts
  );
  const receiptMenuPrintHint = !canPrintIdentificationLabels
    ? 'Seu perfil não tem permissão para imprimir etiquetas de identificação.'
    : !receiptMenuHasLinkedProducts
      ? 'Este recebimento não tem produtos vinculados para etiquetar.'
      : undefined;

  const handleManageInUseInvoice = async (fiscalKey: string) => {
    try {
      const receipt = await fetchGoodsReceiptByFiscalKey(fiscalKey);
      if (!receipt) {
        setReceiptActionDialog({
          kind: 'error',
          title: 'Recebimento não encontrado',
          message: 'Não foi possível localizar o recebimento vinculado a esta nota fiscal.',
        });
        return;
      }
      setIsNewReceiptOpen(false);
      setReceiptToResume(null);
      setReceiptToEdit(null);
      setFocusedReceipt(receipt);
    } catch (error) {
      setReceiptActionDialog({
        kind: 'error',
        title: 'Não foi possível localizar o recebimento',
        message: error instanceof Error ? error.message : 'Tente novamente.',
      });
    }
  };

  const confirmReceiptAction = async () => {
    if (receiptActionDialog?.kind !== 'confirm') return;

    const { action, receipt } = receiptActionDialog;
    setIsReceiptActionRunning(true);
    try {
      if (action === 'discard') {
        await discardMobileGoodsReceiptDraft(receipt.id);
      } else if (action === 'reverse') {
        await reverseMobileGoodsReceipt(receipt);
      } else {
        await unreverseMobileGoodsReceipt(receipt.id);
      }
      setReceiptActionDialog(null);
      await reload();
    } catch (error) {
      setReceiptActionDialog({
        kind: 'error',
        title: action === 'discard'
          ? 'Não foi possível descartar o rascunho'
          : action === 'reverse'
            ? 'Não foi possível estornar'
            : 'Não foi possível desfazer o estorno',
        message: error instanceof Error ? error.message : 'Tente novamente.',
      });
    } finally {
      setIsReceiptActionRunning(false);
    }
  };

  const openMenu = () => {
    menuAnchor.current?.measureInWindow((x, y, anchorWidth, height) => {
      setMenuPosition({ top: y + height + 4, right: Math.max(8, width - x - anchorWidth) });
      setIsMenuOpen(true);
    });
  };

  useEffect(() => {
    if (!focusedReceipt) return;
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
  }, [focusedReceipt]);

  const data: any[] = [
    { type: 'MODULE_HEADER', id: 'MODULE_HEADER' },
    ...(focusedReceipt
      ? [{ type: 'FOCUS_FILTER', id: 'FOCUS_FILTER' }]
      : receipts.length === 0 && !loading
        ? [{ type: 'EMPTY', id: 'EMPTY' }]
        : []),
    ...(focusedReceipt ? [focusedReceipt] : receipts).map((r) => ({ type: 'ITEM', id: r.id, data: r })),
  ];

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => item.id}
        stickyHeaderIndices={[0]}
        renderItem={({ item }) => {
          if (item.type === 'MODULE_HEADER') {
            return renderHeader(
              <View ref={menuAnchor} collapsable={false}>
                <TouchableOpacity
                  style={styles.menuTrigger}
                  onPress={openMenu}
                  accessibilityRole="button"
                  accessibilityLabel="Mais opções de recebimentos"
                >
                  <MoreVertical size={19} color={isDarkMode ? '#cbd5e1' : '#475569'} />
                </TouchableOpacity>
              </View>
            );
          }
          if (item.type === 'EMPTY') {
            return (
              <View style={styles.emptyState}>
                <Box
                  size={48}
                  color={isDarkMode ? '#334155' : '#cbd5e1'}
                  style={{ marginBottom: 16 }}
                />
                <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
                  {loadError || 'Nenhum recebimento encontrado.'}
                </Text>
                {loadError ? (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => void reload()}
                    accessibilityRole="button"
                  >
                    <Text style={styles.retryButtonText}>Tentar novamente</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }
          if (item.type === 'FOCUS_FILTER') {
            return (
              <View style={[styles.focusFilter, isDarkMode && styles.focusFilterDark]}>
                <Text style={[styles.focusFilterText, isDarkMode && styles.textDark]}>
                  Recebimento vinculado à NF-e{focusedReceipt?.invoice_number ? ` #${focusedReceipt.invoice_number}` : ''}
                </Text>
                <TouchableOpacity
                  onPress={() => setFocusedReceipt(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Limpar filtro do recebimento"
                >
                  <Text style={styles.focusFilterAction}>Limpar filtro</Text>
                </TouchableOpacity>
              </View>
            );
          }
          const r = item.data;
          const isDraft = isReceiptDraft(r);

          return (
            <ReceiptCard
              receipt={r}
              isDarkMode={isDarkMode}
              isFocused={focusedReceipt?.id === r.id}
              isDraft={isDraft}
              onOpenReceipt={() => {
                if (isDraft) {
                  setReceiptToEdit(null);
                  setReceiptToResume(r);
                  setIsNewReceiptOpen(true);
                } else {
                  setSelectedReceipt(r);
                }
              }}
              onShowMovement={() => setSelectedMovementReceipt(r)}
              onOpenMenu={() => setReceiptMenu(r)}
            />
          );
        }}
        onEndReached={() => {
          if (!focusedReceipt) void loadMore();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          !focusedReceipt && (loadingMore || loading) ? (
            <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} />
          ) : !focusedReceipt && loadError && receipts.length > 0 ? (
            <View style={styles.retryFooter}>
              <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>{loadError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => void reload()}
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
      <Modal visible={isMenuOpen} transparent animationType="fade" onRequestClose={() => setIsMenuOpen(false)}>
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsMenuOpen(false)} accessibilityRole="button" accessibilityLabel="Fechar menu de opções" />
          <View style={[styles.menu, isDarkMode && styles.menuDark, menuPosition]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setIsMenuOpen(false);
                setIsNewReceiptOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Novo recebimento"
            >
              <Plus size={17} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
              <Text style={[styles.menuText, isDarkMode && styles.textDark]}>Novo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={Boolean(receiptMenu)}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptMenu(null)}
      >
        <View style={styles.receiptMenuOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setReceiptMenu(null)}
            accessibilityRole="button"
            accessibilityLabel="Fechar opções do recebimento"
          />
          <View style={[styles.receiptMenuCard, isDarkMode && styles.menuDark]}>
            <Text style={[styles.receiptMenuTitle, isDarkMode && styles.textDark]}>
              Ações do recebimento
            </Text>
            {receiptMenu?.status === 'received' && !isReceiptDraft(receiptMenu) ? (
              <TouchableOpacity
                style={[styles.menuItem, !receiptMenuCanPrintLabels && { opacity: 0.5 }]}
                onPress={() => {
                  if (!receiptMenuCanPrintLabels) return;
                  const receiptId = String(receiptMenu.id);
                  setReceiptMenu(null);
                  openLabels({ category: 'identificacao', receiptId });
                }}
                disabled={!receiptMenuCanPrintLabels}
                accessibilityRole="button"
                accessibilityLabel="Imprimir etiquetas de identificação"
                accessibilityState={{ disabled: !receiptMenuCanPrintLabels }}
                accessibilityHint={receiptMenuCanPrintLabels ? undefined : receiptMenuPrintHint}
              >
                <Printer size={17} color={receiptMenuCanPrintLabels ? '#2563eb' : '#64748b'} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuText, isDarkMode && styles.textDark]}>Imprimir etiquetas de identificação</Text>
                  {!receiptMenuCanPrintLabels && receiptMenuPrintHint ? (
                    <Text style={[styles.receiptMenuHint, isDarkMode && styles.receiptMenuHintDark]}>
                      {receiptMenuPrintHint}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ) : null}
            {isReceiptDraft(receiptMenu) ? (
              <>
                <TouchableOpacity
                  style={[styles.menuItem, styles.resumeMenuItem]}
                  onPress={() => {
                    setReceiptToEdit(null);
                    setReceiptToResume(receiptMenu);
                    setReceiptMenu(null);
                    setIsNewReceiptOpen(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Retomar cadastramento"
                >
                  <Play size={17} color="#2563eb" />
                  <Text style={[styles.menuText, isDarkMode && styles.textDark]}>Retomar cadastramento</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setReceiptMenu(null);
                    setReceiptActionDialog({ kind: 'confirm', action: 'discard', receipt: receiptMenu });
                  }}
                  disabled={isReceiptActionRunning}
                  accessibilityRole="button"
                  accessibilityLabel="Descartar rascunho"
                >
                  <Trash2 size={17} color="#dc2626" />
                  <Text style={[styles.menuText, styles.dangerMenuText]}>Descartar rascunho</Text>
                </TouchableOpacity>
              </>
            ) : receiptMenu?.status === 'received' ? (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setReceiptToResume(null);
                    setReceiptToEdit(receiptMenu);
                    setReceiptMenu(null);
                    setIsNewReceiptOpen(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Alterar recebimento"
                >
                  <Pencil size={17} color="#2563eb" />
                  <Text style={[styles.menuText, isDarkMode && styles.textDark]}>Alterar recebimento</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setReceiptMenu(null);
                    setReceiptActionDialog({ kind: 'confirm', action: 'reverse', receipt: receiptMenu });
                  }}
                  disabled={isReceiptActionRunning}
                  accessibilityRole="button"
                  accessibilityLabel="Estornar recebimento"
                >
                  <RotateCcw size={17} color="#dc2626" />
                  <Text style={[styles.menuText, styles.dangerMenuText]}>Estornar recebimento</Text>
                </TouchableOpacity>
              </>
            ) : receiptMenu?.status === 'estornado' ? (
              <>
              <TouchableOpacity
                style={[styles.menuItem, { opacity: 0.5 }]}
                onPress={() => {
                  setReceiptMenu(null);
                  setReceiptActionDialog({
                    kind: 'error',
                    title: 'Alteração indisponível',
                    message: 'Para alterar este recebimento, primeiro desfaça o estorno. Quando ele voltar ao status Recebido, você poderá alterá-lo.',
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel="Alterar recebimento"
                accessibilityHint="Exibe por que a alteração está indisponível enquanto o recebimento está estornado."
              >
                <Pencil size={17} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                <Text style={[styles.menuText, isDarkMode && styles.textDark]}>Alterar recebimento</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, unreverseBlocked && { opacity: 0.5 }]}
                onPress={() => {
                  setReceiptMenu(null);
                  setReceiptActionDialog({ kind: 'confirm', action: 'unreverse', receipt: receiptMenu });
                }}
                disabled={isReceiptActionRunning || unreverseBlocked}
                accessibilityRole="button"
                accessibilityLabel="Desfazer estorno"
                accessibilityState={{ disabled: isReceiptActionRunning || unreverseBlocked }}
                accessibilityHint={unreverseBlocked ? unreverseReason : undefined}
              >
                <RotateCcw size={17} color="#059669" />
                <Text style={[styles.menuText, styles.successMenuText]}>Desfazer estorno</Text>
              </TouchableOpacity>
              {unreverseBlocked && <Text style={{ color: isDarkMode ? '#cbd5e1' : '#64748b', fontSize: 12, paddingHorizontal: 14, paddingBottom: 8 }}>{unreverseReason}</Text>}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
      <Modal
        visible={receiptActionDialog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isReceiptActionRunning) setReceiptActionDialog(null);
        }}
      >
        <View style={styles.receiptActionDialogOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            disabled={isReceiptActionRunning}
            onPress={() => setReceiptActionDialog(null)}
            accessibilityRole="button"
            accessibilityLabel="Fechar confirmação do recebimento"
          />
          <View
            style={[styles.receiptActionDialogCard, isDarkMode && styles.menuDark]}
            accessibilityViewIsModal
          >
            <Text style={[styles.receiptActionDialogTitle, isDarkMode && styles.textDark]}>
              {receiptActionDialog?.kind === 'error'
                ? receiptActionDialog.title
                : receiptActionDialog?.action === 'discard'
                  ? 'Descartar rascunho?'
                  : receiptActionDialog?.action === 'reverse'
                    ? 'Estornar recebimento?'
                    : 'Desfazer estorno?'}
            </Text>
            <Text style={[styles.receiptActionDialogMessage, isDarkMode && styles.dialogMessageDark]}>
              {receiptActionDialog?.kind === 'error'
                ? receiptActionDialog.message
                : receiptActionDialog?.action === 'discard'
                  ? 'O rascunho deste recebimento será apagado.'
                  : receiptActionDialog?.action === 'reverse'
                    ? 'O estorno reverte as entradas de estoque deste recebimento.'
                    : 'O recebimento será reativado e as entradas voltarão ao estoque.'}
            </Text>
            <View style={styles.receiptActionDialogActions}>
              {receiptActionDialog?.kind === 'confirm' ? (
                <TouchableOpacity
                  style={[styles.receiptActionDialogButton, styles.receiptActionCancel]}
                  onPress={() => setReceiptActionDialog(null)}
                  disabled={isReceiptActionRunning}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar ação do recebimento"
                >
                  <Text style={[styles.receiptActionCancelText, isDarkMode && styles.textDark]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.receiptActionDialogButton,
                  receiptActionDialog?.kind === 'error'
                    ? styles.receiptActionPrimary
                    : receiptActionDialog?.action === 'unreverse'
                      ? styles.receiptActionSuccess
                      : styles.receiptActionDanger,
                  isReceiptActionRunning && styles.receiptActionButtonDisabled,
                ]}
                onPress={() => {
                  if (receiptActionDialog?.kind === 'error') {
                    setReceiptActionDialog(null);
                    return;
                  }
                  void confirmReceiptAction();
                }}
                disabled={isReceiptActionRunning}
                accessibilityRole="button"
                accessibilityLabel={
                  receiptActionDialog?.kind === 'error'
                    ? 'Fechar mensagem'
                    : receiptActionDialog?.action === 'discard'
                      ? 'Confirmar descarte do rascunho'
                      : receiptActionDialog?.action === 'reverse'
                        ? 'Confirmar estorno do recebimento'
                        : 'Confirmar desfazer estorno'
                }
              >
                {isReceiptActionRunning ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.receiptActionConfirmText}>
                    {receiptActionDialog?.kind === 'error'
                      ? 'Fechar'
                      : receiptActionDialog?.action === 'discard'
                        ? 'Descartar rascunho'
                        : receiptActionDialog?.action === 'reverse'
                          ? 'Estornar recebimento'
                          : 'Desfazer estorno'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <NewGoodsReceiptModal
        visible={isNewReceiptOpen}
        isDarkMode={isDarkMode}
        receiptToResume={receiptToResume}
        receiptToEdit={receiptToEdit}
        onClose={() => {
          setIsNewReceiptOpen(false);
          setReceiptToResume(null);
          setReceiptToEdit(null);
          setInvoiceToStart(null);
        }}
        onSaved={() => void reload()}
        onManageInUseInvoice={handleManageInUseInvoice}
        initialInvoice={invoiceToStart}
      />
      <ReceiptDetailsModal
        visible={Boolean(selectedReceipt)}
        isDarkMode={isDarkMode}
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
      <ReceiptMovementDetailsModal
        visible={Boolean(selectedMovementReceipt)}
        isDarkMode={isDarkMode}
        receipt={selectedMovementReceipt}
        onClose={() => setSelectedMovementReceipt(null)}
      />
    </View>
  );
};
