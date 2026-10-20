import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import { X, ChevronRight } from 'lucide-react-native';
import { BottomNavMoreSheetProps } from './bottomNav.types';
import { styles } from './bottomNav.styles';

/**
 * Modal Bottom Sheet para exibição de abas excedentes da navegação (SRP).
 * Abre ao tocar no botão "Mais" quando há mais de 5 abas ativas.
 */
export const BottomNavMoreSheet: React.FC<BottomNavMoreSheetProps> = ({
  visible,
  isDarkMode,
  bottomInset,
  overflowTabs,
  isTabActive,
  onClose,
  onSelectTab,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.sheetBackdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.sheetContent,
            isDarkMode && styles.sheetContentDark,
            { paddingBottom: bottomInset + 16 },
          ]}
        >
          {/* Linha de pegador (Handle) do Bottom Sheet */}
          <View style={styles.sheetHandleWrapper}>
            <View style={[styles.sheetHandle, isDarkMode && styles.sheetHandleDark]} />
          </View>

          {/* Cabeçalho do Bottom Sheet */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, isDarkMode && styles.sheetTextDark]}>
                Mais Opções
              </Text>
              <Text style={[styles.sheetSubtitle, isDarkMode && styles.sheetSubtitleDark]}>
                Navegação do aplicativo
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, isDarkMode && styles.closeButtonDark]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar menu de mais opções"
            >
              <X size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          {/* Lista de Itens do Bottom Sheet */}
          <ScrollView style={styles.sheetScroll} bounces={false}>
            <View style={styles.sheetItemsContainer}>
              {overflowTabs.map((tab) => {
                const IconComponent = tab.icon;
                const active = isTabActive(tab.key);
                return (
                  <TouchableOpacity
                    key={tab.key}
                    testID={`more-sheet-tab-${tab.key}`}
                    style={[
                      styles.sheetItem,
                      isDarkMode && styles.sheetItemDark,
                      tab.disabled && styles.disabledItem,
                      active &&
                        (isDarkMode ? styles.sheetItemActiveDark : styles.sheetItemActive),
                    ]}
                    disabled={tab.disabled}
                    onPress={() => {
                      onClose();
                      onSelectTab(tab.key, tab.url);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={tab.label}
                  >
                    {tab.key === 'agente' ? (
                      <View style={styles.agentAvatarFrame}>
                        <Image
                          source={require('../../../../../assets/lizandro-small.png')}
                          style={styles.agentAvatar}
                        />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.sheetIconWrapper,
                          active
                            ? styles.sheetIconWrapperActive
                            : isDarkMode
                              ? styles.sheetIconWrapperDark
                              : styles.sheetIconWrapperLight,
                        ]}
                      >
                        <IconComponent
                          size={20}
                          color={active ? '#2563eb' : isDarkMode ? '#cbd5e1' : '#475569'}
                          strokeWidth={active ? 2.5 : 2}
                        />
                      </View>
                    )}
                    <View style={styles.sheetItemTitleRow}>
                      <Text
                        style={[
                          styles.sheetItemLabel,
                          isDarkMode && styles.sheetTextDark,
                          active && styles.sheetItemLabelActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                      {tab.key === 'agente' ? (
                        <View style={styles.agentBetaBadge}>
                          <Text style={styles.agentBetaBadgeText}>BETA</Text>
                        </View>
                      ) : null}
                    </View>
                    <ChevronRight
                      size={18}
                      color={active ? '#2563eb' : isDarkMode ? '#64748b' : '#94a3b8'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
