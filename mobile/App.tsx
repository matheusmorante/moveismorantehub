import React, { useState } from 'react';
import { View, SafeAreaView, StatusBar, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import './src/utils/alertPolyfill';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { MainNavigator } from './src/navigation/MainNavigator';

import { LoginScreen } from './src/components/LoginScreen';
import { PendingApprovalScreen } from './src/components/PendingApprovalScreen';
import { MandatoryUpdateModal } from './src/components/modals/MandatoryUpdateModal';

import { useExpoAutoUpdate } from './src/hooks/useExpoAutoUpdate';
import { useMandatoryAppUpdate } from './src/hooks/useMandatoryAppUpdate';

WebBrowser.maybeCompleteAuthSession();

const AppContent = () => {
  const { userProfile, loadingProfile, handleLogout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const mandatoryUpdate = useMandatoryAppUpdate();

  return (
    <View testID="app-root" style={{ flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#0f172a' : '#f8fafc'} />

      {loadingProfile ? (
        <View style={[styles.center, { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }]}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : !userProfile ? (
        <LoginScreen isDarkMode={isDarkMode} onLoginSuccess={() => {}} />
      ) : (!userProfile.role || userProfile.role === 'pending') ? (
        <PendingApprovalScreen
          isDarkMode={isDarkMode}
          fullName={userProfile.fullName}
          userEmail={userProfile.email}
          onLogout={handleLogout}
        />
      ) : (
        <NotificationProvider>
          <MainNavigator isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        </NotificationProvider>
      )}

      <MandatoryUpdateModal
        visible={mandatoryUpdate.visible}
        required={mandatoryUpdate.required}
        version={mandatoryUpdate.release?.version || ''}
        buildNumber={mandatoryUpdate.release?.build_number || 0}
        releaseNotes={mandatoryUpdate.release?.release_notes || null}
        downloading={mandatoryUpdate.downloading}
        downloadProgress={mandatoryUpdate.downloadProgress}
        error={mandatoryUpdate.downloadError}
        onDownload={() => void mandatoryUpdate.downloadUpdate()}
        onDismiss={mandatoryUpdate.dismissUpdate}
      />
    </View>
  );
};

export default function App() {
  useExpoAutoUpdate();

  // The AuthProvider wraps everything so we can easily query authentication state
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
