import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Bot, Sparkles } from 'lucide-react-native';
import { FinancialCategory, fetchFinancialCategories } from '../../../services/mobileFinanceService';
import { FinancialAiChatView } from '../../finance/components/FinancialAiChatView';

interface Props {
  userProfile?: any;
  isDarkMode?: boolean;
}

export const GlobalAgentScreen: React.FC<Props> = ({
  userProfile,
  isDarkMode = false,
}) => {
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const userName = userProfile?.full_name || userProfile?.name || 'Operador';

  useEffect(() => {
    let isMounted = true;
    fetchFinancialCategories()
      .then(cats => {
        if (isMounted) setCategories(cats);
      })
      .catch(() => {
        // Silencioso se offline ou erro de rede
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Header do Agente Global */}
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, isDarkMode && styles.iconCircleDark]}>
            <Sparkles size={18} color="#7c3aed" />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.title, isDarkMode && styles.textDark]}>
                Agente do ERP
              </Text>
              <View style={styles.betaBadge}>
                <Text style={styles.betaBadgeText}>BETA</Text>
              </View>
            </View>
            <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
              Assistente inteligente Morante Hub
            </Text>
          </View>
        </View>
      </View>

      {/* Conteúdo conversacional */}
      <View style={styles.chatContainer}>
        <FinancialAiChatView
          categories={categories}
          onTransactionRegistered={() => {
            // Callback opcional de atualização
          }}
          userName={userName}
          isDarkMode={isDarkMode}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerDark: {
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  iconCircleDark: {
    backgroundColor: '#2e1065',
    borderColor: '#5b21b6',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  textDark: {
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  subtitleDark: {
    color: '#94a3b8',
  },
  betaBadge: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  betaBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  chatContainer: {
    flex: 1,
  },
});
