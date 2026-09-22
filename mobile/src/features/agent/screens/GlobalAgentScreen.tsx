import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
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
      <FinancialAiChatView
        categories={categories}
        onTransactionRegistered={() => {
          // Callback opcional de atualização
        }}
        userName={userName}
        isDarkMode={isDarkMode}
      />
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
});
