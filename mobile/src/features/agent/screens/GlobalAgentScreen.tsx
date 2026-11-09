import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  FinancialCategory,
  fetchFinancialCategories,
} from '../../../services/mobileFinanceService';
import { FinancialAiChatView } from '../../finance/components/FinancialAiChatView';
import { useAuth } from '../../../contexts/AuthContext';

interface Props {
  userProfile?: any;
  isDarkMode?: boolean;
}

export const GlobalAgentScreen: React.FC<Props> = ({
  userProfile: propUserProfile,
  isDarkMode = false,
}) => {
  const { userProfile: authUserProfile, rolePermissions } = useAuth();
  const effectiveProfile = propUserProfile || authUserProfile;
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const userName =
    effectiveProfile?.full_name ||
    effectiveProfile?.fullName ||
    effectiveProfile?.name ||
    'Operador';

  const permissionContext = useMemo(
    () => ({
      ...effectiveProfile,
      rolePermissions: rolePermissions || effectiveProfile?.rolePermissions,
      enforced: true,
    }),
    [effectiveProfile, rolePermissions]
  );

  useEffect(() => {
    let isMounted = true;
    fetchFinancialCategories()
      .then((cats) => {
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
        userProfile={permissionContext}
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
