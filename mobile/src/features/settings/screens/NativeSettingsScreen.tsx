import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../../../services/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import {
  PRODUCT_ACCESS_ROLES,
  PRODUCT_PERMISSION_AREA,
  type ProductPermissionAction,
  type ProductPermissionRole,
} from '../../../../../shared-utils/productPermissions';

const capabilityLabels = {
  view: 'Acessar',
  edit: 'Criar e editar',
  delete: 'Excluir',
  operate: 'Operar',
} as const;

export function NativeSettingsScreen({
  isDarkMode,
  setIsDarkMode,
  isAdmin = false,
  onBack,
}: {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
  isAdmin?: boolean;
  onBack: () => void;
}) {
  const {
    rolePermissions,
    rolePermissionsLoaded,
    rolePermissionsLoadFailed,
    reloadRolePermissions,
    saveRolePermissions,
  } = useAuth();
  const [selectedRole, setSelectedRole] = useState<ProductPermissionRole>('manager');
  const [savingPermission, setSavingPermission] = useState(false);
  const actionGroups = useMemo(() => {
    const groups = new Map<string, ProductPermissionAction[]>();
    PRODUCT_PERMISSION_AREA.actions.forEach((action) => {
      const actions = groups.get(action.submodule) || [];
      actions.push(action);
      groups.set(action.submodule, actions);
    });
    return [...groups.entries()];
  }, []);

  const isGranted = (action: ProductPermissionAction) =>
    selectedRole === 'administrator' ||
    (rolePermissions[action.id] ?? action.defaultRoles).includes(selectedRole);

  const updatePermission = async (actionId: string, enabled: boolean) => {
    if (selectedRole === 'administrator' || savingPermission) return;
    const selectedAction = PRODUCT_PERMISSION_AREA.actions.find((action) => action.id === actionId);
    if (!selectedAction) return;

    const updates: Record<string, string[]> = {};
    const applyRole = (action: ProductPermissionAction, nextEnabled: boolean) => {
      const currentRoles = updates[action.id] ?? rolePermissions[action.id] ?? [...action.defaultRoles];
      updates[action.id] = nextEnabled
        ? [...new Set([...currentRoles, selectedRole])]
        : currentRoles.filter((role) => role !== selectedRole);
    };
    const relatedActions = PRODUCT_PERMISSION_AREA.actions.filter(
      (action) => action.submodule === selectedAction.submodule
    );
    const viewAction = relatedActions.find((action) => action.capability === 'view');

    applyRole(selectedAction, enabled);
    if (selectedAction.capability === 'view' && !enabled) {
      relatedActions
        .filter((action) => action.capability !== 'view')
        .forEach((action) => {
          applyRole(action, false);
        });
    } else if (selectedAction.capability !== 'view' && enabled && viewAction) {
      applyRole(viewAction, true);
    }

    setSavingPermission(true);
    try {
      await saveRolePermissions(updates);
    } catch (error: any) {
      Alert.alert('Não foi possível salvar os acessos', error?.message || 'Tente novamente.');
    } finally {
      setSavingPermission(false);
    }
  };

  const updateTheme = async (darkMode: boolean) => {
    setIsDarkMode(darkMode);
    const { data } = await supabase.from('settings').select('data').eq('id', 'app').maybeSingle();
    const { error } = await supabase.from('settings').upsert({
      id: 'app',
      data: {
        ...(data?.data || {}),
        mobileSettings: { ...(data?.data?.mobileSettings || {}), darkMode },
      },
    });
    if (error) Alert.alert('Não foi possível salvar a aparência', error.message);
  };
  return (
    <View style={[styles.page, isDarkMode && styles.dark]}>
      <View style={[styles.header, isDarkMode && styles.darkBorder]}>
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <ChevronLeft size={24} color={isDarkMode ? '#e2e8f0' : '#0f172a'} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, isDarkMode && styles.light]}>Configurações</Text>
          <Text style={styles.subtitle}>Preferências do aplicativo</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.light]}>Aparência</Text>
          <View style={styles.row}>
            <View>
              <Text style={[styles.label, isDarkMode && styles.light]}>Modo escuro</Text>
              <Text style={styles.hint}>Usar o tema escuro no aplicativo</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={(value) => void updateTheme(value)}
              trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
            />
          </View>
        </View>

        {isAdmin && (
          <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <View style={styles.accessHeading}>
              <ShieldCheck size={19} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
              <View style={styles.accessHeadingText}>
                <Text style={[styles.sectionTitle, isDarkMode && styles.light]}>
                  Acessos de Produtos
                </Text>
                <Text style={styles.hint}>Mesmas ações e perfis configurados no ERP.</Text>
              </View>
            </View>

            {!rolePermissionsLoaded ? (
              <View style={styles.loadingAccess}>
                {rolePermissionsLoadFailed ? (
                  <View style={styles.retryAccess}>
                    <Text style={styles.hint}>
                      Não foi possível confirmar os acessos configurados.
                    </Text>
                    <TouchableOpacity
                      onPress={reloadRolePermissions}
                      accessibilityRole="button"
                      style={styles.retryAccessButton}
                    >
                      <Text style={styles.retryAccessText}>Tentar novamente</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <ActivityIndicator color="#2563eb" />
                    <Text style={styles.hint}>Carregando permissões...</Text>
                  </>
                )}
              </View>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.roleChips}>
                    {PRODUCT_ACCESS_ROLES.map((role) => {
                      const selected = selectedRole === role.value;
                      return (
                        <TouchableOpacity
                          key={role.value}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => setSelectedRole(role.value)}
                          style={[
                            styles.roleChip,
                            selected && styles.roleChipSelected,
                            isDarkMode && styles.roleChipDark,
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleChipText,
                              selected && styles.roleChipTextSelected,
                              isDarkMode && !selected && styles.light,
                            ]}
                          >
                            {role.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <Text style={[styles.roleDescription, isDarkMode && styles.light]}>
                  {PRODUCT_ACCESS_ROLES.find((role) => role.value === selectedRole)?.description}
                </Text>
                {selectedRole === 'administrator' && (
                  <Text style={styles.hint}>
                    Administradores mantêm acesso total, conforme a regra do ERP.
                  </Text>
                )}

                {actionGroups.map(([submodule, actions]) => (
                  <View key={submodule} style={styles.permissionGroup}>
                    <Text style={[styles.permissionGroupTitle, isDarkMode && styles.light]}>
                      {submodule}
                    </Text>
                    {actions.map((action) => (
                      <View
                        key={action.id}
                        style={[styles.permissionRow, isDarkMode && styles.darkBorder]}
                      >
                        <View style={styles.permissionCopy}>
                          <Text style={[styles.permissionLabel, isDarkMode && styles.light]}>
                            {action.label}
                          </Text>
                          <Text style={styles.hint}>
                            {capabilityLabels[action.capability]} · {action.description}
                          </Text>
                        </View>
                        <Switch
                          value={isGranted(action)}
                          disabled={selectedRole === 'administrator' || savingPermission}
                          onValueChange={(value) => void updatePermission(action.id, value)}
                          accessibilityLabel={`${action.label}: ${selectedRole}`}
                          trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                        />
                      </View>
                    ))}
                  </View>
                ))}
                {savingPermission && (
                  <View style={styles.savingAccess}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={styles.hint}>Salvando permissões...</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  dark: { backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  darkBorder: { borderColor: '#334155' },
  back: { padding: 4 },
  title: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 11, color: '#64748b' },
  content: { padding: 16, gap: 14, paddingBottom: 36 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  light: { color: '#f8fafc' },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  label: { fontSize: 13, fontWeight: '800', color: '#334155' },
  hint: { fontSize: 11, color: '#64748b', marginTop: 2 },
  accessHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  accessHeadingText: { flex: 1, gap: 3 },
  loadingAccess: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 24 },
  retryAccess: { alignItems: 'flex-start', gap: 10, paddingVertical: 18 },
  retryAccessButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  retryAccessText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  roleChips: { flexDirection: 'row', gap: 8, paddingVertical: 14 },
  roleChip: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  roleChipDark: { backgroundColor: '#0f172a', borderColor: '#475569' },
  roleChipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  roleChipText: { color: '#475569', fontSize: 12, fontWeight: '800' },
  roleChipTextSelected: { color: '#ffffff' },
  roleDescription: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 8 },
  permissionGroup: { marginTop: 16 },
  permissionGroupTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  permissionCopy: { flex: 1, gap: 4 },
  permissionLabel: { fontSize: 13, fontWeight: '800', color: '#334155' },
  savingAccess: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14 },
});
