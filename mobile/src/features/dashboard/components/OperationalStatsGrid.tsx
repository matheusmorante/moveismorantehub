import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { Calendar, Truck, Hammer, Wrench, RotateCcw, Check } from 'lucide-react-native';

interface Props {
  isDarkMode: boolean;
  selectedPeriod: string;
  setShowPeriodModal: (val: boolean) => void;
  showPeriodModal: boolean;
  PERIOD_OPTIONS: any[];
  handlePeriodChange: (id: string) => void;
  deliveriesCount: number;
  assembliesInternalCount: number;
  assembliesOutsideCount: number;
  assistancesCount: number;
  returnsCount: number;
  loadingStats: boolean;
  handleTabChange: (tab: string, url: string) => void;
  setAssemblySubTab: (sub: 'internal' | 'outside') => void;
  WEB_URL: string;
}

export const OperationalStatsGrid: React.FC<Props> = ({
  isDarkMode,
  selectedPeriod,
  setShowPeriodModal,
  showPeriodModal,
  PERIOD_OPTIONS,
  handlePeriodChange,
  deliveriesCount,
  assembliesInternalCount,
  assembliesOutsideCount,
  assistancesCount,
  returnsCount,
  loadingStats,
  handleTabChange,
  setAssemblySubTab,
  WEB_URL,
}) => {
  const currentPeriodLabel = PERIOD_OPTIONS.find(p => p.id === selectedPeriod)?.label || 'Hoje';

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {/* Cabeçalho de Estatísticas com Filtro */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 12,
        paddingHorizontal: 2
      }}>
        <Text style={{ fontSize: 14, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a', letterSpacing: 0.2 }}>
          Estatísticas Operacionais
        </Text>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#cbd5e1',
            elevation: 1
          }}
          onPress={() => setShowPeriodModal(true)}
        >
          <Calendar size={13} color="#2563eb" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
            {currentPeriodLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grid de Cards Operacionais */}
      <View style={styles.statsGrid}>
        {/* Card 1: Entregas */}
        <TouchableOpacity
          style={[styles.statCardGrid, styles.deliveryCard]}
          onPress={() => handleTabChange('entregas', `${WEB_URL}/schedule`)}
        >
          <View style={styles.statIconWrapper}>
            <Truck size={22} color="#2563eb" />
          </View>
          {loadingStats ? (
            <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.statNumber}>{deliveriesCount}</Text>
          )}
          <Text style={styles.statLabel}>Entregas Agendadas</Text>
        </TouchableOpacity>

        {/* Card 2A: Montagens Internas */}
        <TouchableOpacity
          style={[styles.statCardGrid, styles.assemblyCard]}
          onPress={() => {
            setAssemblySubTab('internal');
            handleTabChange('montagens', `${WEB_URL}/assembly-schedule`);
          }}
        >
          <View style={styles.statIconWrapper}>
            <Hammer size={22} color="#7c3aed" />
          </View>
          {loadingStats ? (
            <ActivityIndicator size="small" color="#7c3aed" style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.statNumber}>
              {assembliesInternalCount} <Text style={{ fontSize: 13, fontWeight: '600' }}>{assembliesInternalCount === 1 ? 'móvel' : 'móveis'}</Text>
            </Text>
          )}
          <Text style={[styles.statLabel, { color: isDarkMode ? '#cbd5e1' : '#6d28d9' }]}>devem ser montados na loja</Text>
        </TouchableOpacity>

        {/* Card 2B: Montagens Fora */}
        <TouchableOpacity
          style={[styles.statCardGrid, styles.assemblyOutsideCard]}
          onPress={() => {
            setAssemblySubTab('outside');
            handleTabChange('montagens', `${WEB_URL}/assembly-schedule`);
          }}
        >
          <View style={styles.statIconWrapper}>
            <Hammer size={22} color="#ef4444" />
          </View>
          {loadingStats ? (
            <ActivityIndicator size="small" color="#ef4444" style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.statNumber}>
              {assembliesOutsideCount} <Text style={{ fontSize: 13, fontWeight: '600' }}>{assembliesOutsideCount === 1 ? 'móvel' : 'móveis'}</Text>
            </Text>
          )}
          <Text style={[styles.statLabel, { color: isDarkMode ? '#cbd5e1' : '#e11d48' }]}>devem ser montados fora</Text>
        </TouchableOpacity>

        {/* Card 3: Assistências */}
        <TouchableOpacity
          style={[styles.statCardGrid, styles.assistanceCard]}
          onPress={() => handleTabChange('entregas', `${WEB_URL}/delivery-schedule`)}
        >
          <View style={styles.statIconWrapper}>
            <Wrench size={22} color="#d97706" />
          </View>
          {loadingStats ? (
            <ActivityIndicator size="small" color="#d97706" style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.statNumber}>{assistancesCount}</Text>
          )}
          <Text style={styles.statLabel}>Assistências</Text>
        </TouchableOpacity>

        {/* Card 4: Devoluções */}
        <TouchableOpacity
          style={[styles.statCardGrid, styles.returnCard]}
          onPress={() => handleTabChange('pedidos', `${WEB_URL}/sales-order`)}
        >
          <View style={styles.statIconWrapper}>
            <RotateCcw size={22} color="#e11d48" />
          </View>
          {loadingStats ? (
            <ActivityIndicator size="small" color="#e11d48" style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.statNumber}>{returnsCount}</Text>
          )}
          <Text style={styles.statLabel}>Devoluções</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Seleção de Período */}
      <Modal
        visible={showPeriodModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowPeriodModal(false)}
        >
          <View style={styles.periodModalContent}>
            <View style={styles.periodModalHeader}>
              <Calendar size={18} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={styles.periodModalTitle}>Selecione o Período</Text>
            </View>

            <View style={styles.periodModalOptionsList}>
              {PERIOD_OPTIONS.map((period) => {
                const isSelected = selectedPeriod === period.id;
                return (
                  <TouchableOpacity
                    key={period.id}
                    style={[
                      styles.periodModalOption,
                      isSelected && styles.periodModalOptionActive
                    ]}
                    onPress={() => {
                      handlePeriodChange(period.id);
                      setShowPeriodModal(false);
                    }}
                  >
                    <Text style={[
                      styles.periodModalOptionText,
                      isSelected && styles.periodModalOptionTextActive
                    ]}>
                      {period.label}
                    </Text>
                    {isSelected && <Check size={16} color="#2563eb" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20
  },
  statCardGrid: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6
  },
  deliveryCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe'
  },
  assemblyCard: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe'
  },
  assemblyOutsideCard: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3'
  },
  assistanceCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7'
  },
  returnCard: {
    backgroundColor: '#fff1f2',
    borderColor: '#ffe4e6'
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 1
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 2
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  periodModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12
  },
  periodModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  periodModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a'
  },
  periodModalOptionsList: {
    gap: 8
  },
  periodModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  periodModalOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe'
  },
  periodModalOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569'
  },
  periodModalOptionTextActive: {
    color: '#2563eb',
    fontWeight: '900'
  }
});
