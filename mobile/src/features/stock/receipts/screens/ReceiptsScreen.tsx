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
  Check,
  MoreVertical,
  PackagePlus,
  PackageX,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react-native';
import { useReceipts } from '../hooks/useReceipts';
import { ReceiptCheckScreen } from './ReceiptCheckScreen';
import { NewGoodsReceiptModal } from '../modals/NewGoodsReceiptModal';
import { supabase } from '../../../../services/supabaseClient';
import { normalizeFiscalIdentifier } from '../../../../../../shared-utils/fiscalIdentifiers';
import { fetchInUseInvoiceKeys, IN_USE_INVOICE_MESSAGE } from '../../../../../../shared-utils/receiptInvoiceAvailability';
import {
  discardMobileGoodsReceiptDraft,
  reverseMobileGoodsReceipt,
  unreverseMobileGoodsReceipt,
  fetchGoodsReceiptByFiscalKey,
} from '../../../../services/stock/stockReceiptsService';

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: (rightAction?: ReactNode) => React.ReactElement;
}

const isReceiptDraft = (receipt: any) => receipt?.is_draft === true || receipt?.status === 'draft';

type ReceiptActionDialog =
  | { kind: 'confirm'; action: 'discard' | 'reverse' | 'unreverse'; receipt: any }
  | { kind: 'error'; title: string; message: string };

export const ReceiptsScreen: React.FC<Props> = ({ isDarkMode, onBack, renderHeader }) => {
  const { receipts, loading, loadingMore, loadMore, loadError, reload } = useReceipts();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<any> | null>(null);
  const menuAnchor = useRef<View>(null);
  const [focusedReceipt, setFocusedReceipt] = useState<any | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [receiptMenu, setReceiptMenu] = useState<any | null>(null);
  const [receiptToResume, setReceiptToResume] = useState<any | null>(null);
  const [receiptToEdit, setReceiptToEdit] = useState<any | null>(null);
  const [isNewReceiptOpen, setIsNewReceiptOpen] = useState(false);
  const [isReceiptActionRunning, setIsReceiptActionRunning] = useState(false);
  const [receiptActionDialog, setReceiptActionDialog] = useState<ReceiptActionDialog | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 16 });
  const [unreverseCheck, setUnreverseCheck] = useState<{ id: string; state: 'checking' | 'available' | 'blocked' | 'error' } | null>(null);
  const receiptMenuKey = receiptMenu?.fiscal_key || receiptMenu?.fiscalKey || '';
  useEffect(() => {
    let active = true;
    if (!receiptMenu || receiptMenu.status !== 'estornado' || !receiptMenuKey) {
      setUnreverseCheck(null);
      return () => { active = false; };
    }
    const id = receiptMenu.id;
    setUnreverseCheck({ id, state: 'checking' });
    void fetchInUseInvoiceKeys(supabase, [receiptMenuKey], id)
      .then((keys) => {
        if (active) setUnreverseCheck({ id, state: keys.has(normalizeFiscalIdentifier(receiptMenuKey)) ? 'blocked' : 'available' });
      })
      .catch(() => { if (active) setUnreverseCheck({ id, state: 'error' }); });
    return () => { active = false; };
  }, [receiptMenu?.id, receiptMenu?.status, receiptMenuKey]);
  const unreverseState = !receiptMenuKey ? 'available' : unreverseCheck?.id === receiptMenu?.id ? unreverseCheck.state : 'checking';
  const unreverseBlocked = unreverseState !== 'available';
  const unreverseReason = unreverseState === 'blocked' ? IN_USE_INVOICE_MESSAGE :
    unreverseState === 'error' ? 'Não foi possível conferir a nota. Feche e abra o menu para tentar novamente.' :
    'Conferindo o recebimento da nota...';

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

  if (selectedReceipt) {
    return (
      <ReceiptCheckScreen
        isDarkMode={isDarkMode}
        receipt={selectedReceipt}
        onBack={() => setSelectedReceipt(null)}
        onCompleted={() => {
          void reload();
        }}
      />
    );
  }

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
          const hasNF = Boolean(r.fiscal_key);
          const formattedDate = new Date(r.received_at || r.created_at).toLocaleDateString('pt-BR');
          const total = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(r.totalValue || 0);
          const isDraft = isReceiptDraft(r);
          const isEstornado = r.status === 'estornado';
          const movementBadgeLabel = isDraft
            ? 'Sem Movimentação'
            : isEstornado
              ? 'Entrada Estornada'
              : 'Entrada Efetivada';

          return (
            <View style={styles.cardContainer}>
              <TouchableOpacity
                style={[
                  styles.card,
                  isDarkMode && styles.cardDark,
                  focusedReceipt?.id === r.id && styles.focusedReceiptCard,
                ]}
                onPress={() => {
                  if (isDraft) {
                    setReceiptToEdit(null);
                    setReceiptToResume(r);
                    setIsNewReceiptOpen(true);
                  } else {
                    setSelectedReceipt(r);
                  }
                }}
              >
                <View style={styles.receiptCardHeader}>
                  <View>
                    <Text style={[styles.title, isDarkMode && styles.textDark]}>
                      #
                      {r.receipt_index || r.receiptIndex
                        ? String(r.receipt_index || r.receiptIndex).padStart(6, '0')
                        : r.id
                          ? r.id.split('-')[0].toUpperCase()
                          : '—'}
                    </Text>
                    <Text
                      style={{ color: '#059669', fontSize: 12, fontWeight: '700', marginTop: 2 }}
                    >
                      {r.items?.length || 0} itens recebidos
                    </Text>
                  </View>
                  <View style={styles.receiptStatusGroup}>
                    <View
                      style={[
                        styles.movementBadge,
                        isDraft
                          ? styles.movementBadgePending
                          : isEstornado
                            ? styles.movementBadgeReversed
                            : styles.movementBadgeEffective,
                      ]}
                      accessible
                      accessibilityRole="image"
                      accessibilityLabel={`Movimentação do recebimento: ${movementBadgeLabel}`}
                    >
                      {isEstornado ? (
                        <PackageX size={16} color="#ffffff" />
                      ) : (
                        <PackagePlus size={16} color="#ffffff" />
                      )}
                      {!isDraft && !isEstornado && (
                        <View style={styles.movementBadgeCheckIndicator}>
                          <Check size={7} color="#ffffff" strokeWidth={3} />
                        </View>
                      )}
                    </View>
                    <View
                      style={[
                        styles.badge,
                        isDraft ? styles.badgeDraft : isEstornado ? styles.badgeError : styles.badgeSuccess,
                        isDarkMode && { opacity: 0.8 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isDraft
                            ? styles.badgeTextDraft
                            : isEstornado
                              ? styles.badgeTextError
                              : styles.badgeTextSuccess,
                        ]}
                      >
                        {isDraft ? 'Rascunho' : isEstornado ? 'Estornado' : 'Recebido'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ marginTop: 12, gap: 6 }}>
                  <View style={styles.receiptSupplierRow}>
                    <Text
                      style={[styles.supplierName, styles.receiptSupplierName, isDarkMode && styles.textDark]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {r.supplierName}
                    </Text>
                    <Text
                      style={[styles.receiptInvoiceLabel, isDarkMode && styles.receiptInvoiceLabelDark]}
                      numberOfLines={1}
                    >
                      {hasNF
                        ? `📄 Com NF ${r.invoice_number ? `(${r.invoice_number})` : ''}`
                        : '📄 Sem NF'}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 2,
                    }}
                  >
                    <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 13 }}>
                      📅 {formattedDate}
                    </Text>
                    <View style={styles.receiptTotalInline}>
                      <Text style={[styles.receiptTotalLabel, isDarkMode && styles.receiptTotalLabelDark]}>
                        Total recebido
                      </Text>
                      <Text
                        style={[styles.receiptTotalValue, isDarkMode && styles.textDark]}
                        accessibilityLabel={`Total recebido ${total}`}
                      >
                        {total}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cardMenuTrigger, isDarkMode && styles.cardMenuTriggerDark]}
                onPress={() => setReceiptMenu(r)}
                accessibilityRole="button"
                accessibilityLabel={`Mais opções do recebimento ${r.receipt_index || ''}`}
              >
                <MoreVertical size={18} color={isDarkMode ? '#cbd5e1' : '#475569'} />
              </TouchableOpacity>
            </View>
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
        }}
        onSaved={() => void reload()}
        onManageInUseInvoice={handleManageInUseInvoice}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptyTextDark: { color: '#94a3b8' },
  retryFooter: { padding: 16, alignItems: 'center', gap: 10 },
  retryButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  retryButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  menuTrigger: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: { flex: 1 },
  menu: { position: 'absolute', minWidth: 168, padding: 5, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', elevation: 8 },
  menuDark: { borderColor: '#334155', backgroundColor: '#1e293b' },
  menuItem: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 },
  resumeMenuItem: { minHeight: 42, paddingHorizontal: 8, borderRadius: 10 },
  menuText: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pageHeaderDark: { backgroundColor: '#0f172a', borderBottomColor: '#1e293b' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnDark: { backgroundColor: '#1e293b' },
  pageTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  textDark: { color: '#f8fafc' },
  cardContainer: { paddingHorizontal: 16, paddingTop: 12, position: 'relative' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  receiptCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  receiptStatusGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 46 },
  focusedReceiptCard: { borderColor: '#2563eb', borderWidth: 2 },
  focusFilter: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  focusFilterDark: { borderColor: '#1d4ed8', backgroundColor: '#172554' },
  focusFilterText: { flex: 1, color: '#1e3a8a', fontSize: 12, fontWeight: '700' },
  focusFilterAction: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  cardMenuTrigger: {
    position: 'absolute',
    top: 17,
    right: 26,
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  cardMenuTriggerDark: { backgroundColor: '#334155' },
  receiptMenuOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  receiptMenuCard: {
    width: '100%',
    maxWidth: 360,
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 10,
  },
  receiptMenuTitle: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  receiptActionDialogOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  receiptActionDialogCard: {
    width: '100%',
    maxWidth: 360,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 12,
  },
  receiptActionDialogTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  receiptActionDialogMessage: { marginTop: 10, color: '#475569', fontSize: 14, lineHeight: 20 },
  dialogMessageDark: { color: '#cbd5e1' },
  receiptActionDialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
  },
  receiptActionDialogButton: {
    minHeight: 44,
    minWidth: 92,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  receiptActionCancel: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff' },
  receiptActionDanger: { backgroundColor: '#dc2626' },
  receiptActionSuccess: { backgroundColor: '#059669' },
  receiptActionPrimary: { backgroundColor: '#2563eb' },
  receiptActionCancelText: { color: '#334155', fontSize: 13, fontWeight: '700' },
  receiptActionConfirmText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  receiptActionButtonDisabled: { opacity: 0.65 },
  dangerMenuText: { color: '#dc2626' },
  successMenuText: { color: '#059669' },
  title: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  supplierName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  receiptSupplierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  receiptSupplierName: { flex: 1, minWidth: 0 },
  receiptInvoiceLabel: { color: '#64748b', fontSize: 11, fontWeight: '600', flexShrink: 0 },
  receiptInvoiceLabelDark: { color: '#94a3b8' },
  receiptTotalInline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  receiptTotalLabel: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  receiptTotalLabelDark: { color: '#94a3b8' },
  receiptTotalValue: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  movementBadge: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center', position: 'relative', borderWidth: 1 },
  movementBadgeEffective: { backgroundColor: '#059669', borderColor: '#047857' },
  movementBadgePending: { backgroundColor: '#94a3b8', borderColor: '#64748b' },
  movementBadgeReversed: { backgroundColor: '#dc2626', borderColor: '#b91c1c' },
  movementBadgeCheckIndicator: { position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: '#065f46', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ffffff' },
  badgeSuccess: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  badgeDraft: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  badgeError: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  badgeTextSuccess: { color: '#059669' },
  badgeTextDraft: { color: '#d97706' },
  badgeTextError: { color: '#dc2626' },
});
