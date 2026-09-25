import React, { useState } from 'react';
import { Image, Modal, Platform, Pressable, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { Bell, ChevronRight, LogOut, MoreVertical, Moon, Settings, Sun } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { MORANTE_BRAND_MARK_SVG } from '../../../assets/moranteBrandMarkSvg';

interface Props {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  setShowProfileModal: (val: boolean) => void;
  handleOpenNotificationsModal: () => void;
  unreadCount: number;
  title: string;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const DashboardHeader: React.FC<Props> = ({
  isDarkMode,
  setIsDarkMode,
  setShowProfileModal,
  handleOpenNotificationsModal,
  unreadCount,
  title,
  onOpenSettings,
  onLogout,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0
  );
  const totalHeaderHeight = 54 + topInset;
  const menuTop = totalHeaderHeight + 8;
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const text = isDarkMode ? '#f8fafc' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';
  const border = isDarkMode ? '#334155' : '#e2e8f0';

  const closeMenu = () => setMenuVisible(false);
  const runMenuAction = (action: () => void) => {
    closeMenu();
    action();
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0b2b53" translucent />
      <View style={{
        height: totalHeaderHeight,
        paddingTop: topInset,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0b2b53',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <SvgXml xml={MORANTE_BRAND_MARK_SVG} width={30} height={30} />
          <Text numberOfLines={1} style={{ color: '#ffffff', fontSize: 17, fontWeight: '700', marginLeft: 12, flexShrink: 1 }}>
            {title}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={handleOpenNotificationsModal}
            accessibilityRole="button"
            accessibilityLabel={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ''}`}
            style={{ width: 36, height: 40, alignItems: 'center', justifyContent: 'center', position: 'relative' }}
          >
            <Bell size={21} color="#ffffff" />
            {unreadCount > 0 && <View style={{ position: 'absolute', top: 3, right: 1, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
              <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '800' }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir menu da conta"
            style={{ width: 32, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <MoreVertical size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable onPress={closeMenu} style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.18)' }}>
          <Pressable
            onPress={event => event.stopPropagation()}
            style={{ position: 'absolute', top: menuTop, right: 12, left: 12, maxWidth: 380, alignSelf: 'flex-end', borderRadius: 16, backgroundColor: surface, borderWidth: 1, borderColor: border, paddingHorizontal: 8, paddingVertical: 6, elevation: 12, shadowColor: '#0f172a', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}
          >
            <TouchableOpacity
              onPress={() => runMenuAction(() => setShowProfileModal(true))}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', minHeight: 66, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: border }}
            >
              <Image source={require('../../../../assets/lizandro-small.png')} style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#2563eb', marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: text, fontSize: 14, fontWeight: '700' }}>Minha conta</Text>
                <Text style={{ color: muted, fontSize: 12, marginTop: 2 }}>Ver e editar meu perfil</Text>
              </View>
              <ChevronRight size={18} color={muted} />
            </TouchableOpacity>

            <MenuRow icon={<Settings size={19} color={isDarkMode ? '#93c5fd' : '#2563eb'} />} title="Configurações" text={text} border={border} onPress={() => runMenuAction(onOpenSettings)} />
            <TouchableOpacity
              onPress={() => setIsDarkMode(previous => !previous)}
              accessibilityRole="button"
              accessibilityLabel={`Tema ${isDarkMode ? 'escuro' : 'claro'}, tocar para alternar`}
              style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: border }}
            >
              {isDarkMode ? <Moon size={19} color="#818cf8" /> : <Sun size={19} color="#f59e0b" />}
              <Text style={{ flex: 1, color: text, fontSize: 14, marginLeft: 14 }}>Tema</Text>
              <Text style={{ color: muted, fontSize: 13, marginRight: 5 }}>{isDarkMode ? 'Escuro' : 'Claro'}</Text>
              <ChevronRight size={17} color={muted} />
            </TouchableOpacity>
            <MenuRow icon={<Bell size={19} color={isDarkMode ? '#cbd5e1' : '#475569'} />} title="Notificações" text={text} border={border} onPress={() => runMenuAction(handleOpenNotificationsModal)} />
            <MenuRow icon={<LogOut size={19} color="#ef4444" />} title="Sair" text="#ef4444" border="transparent" onPress={() => runMenuAction(onLogout)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

function MenuRow({ icon, title, text, border, onPress }: { icon: React.ReactNode; title: string; text: string; border: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: border }}>
      {icon}
      <Text style={{ color: text, fontSize: 14, marginLeft: 14 }}>{title}</Text>
    </TouchableOpacity>
  );
}
