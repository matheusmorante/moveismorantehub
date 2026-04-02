import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { LayoutGrid, ClipboardList, Map, Settings, Camera, MapPin, Bell } from 'lucide-react-native';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';

const WEB_URL = "https://moveismorantehub.vercel.app"; 

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [webViewUrl, setWebViewUrl] = useState(WEB_URL);
  const [isScanning, setIsScanning] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const webViewRef = useRef<WebView>(null);

  // Inicializao de GPS em Tempo Real
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisso de GPS negada', 'Precisamos da sua localizao para otimizar as entregas.');
        return;
      }

      // Tracking ativo a cada 10 metros ou 30 segundos
      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (newLocation: Location.LocationObject) => {
          setLocation(newLocation);
          // Otimizado: Sincronizar com Supabase aqui (suprimido para brevidade)
          console.log('Localizao atualizada:', newLocation.coords);
          
          // Podemos enviar para o WebView tambm
          webViewRef.current?.postMessage(JSON.stringify({ 
            type: 'LOCATION_UPDATE', 
            coords: newLocation.coords 
          }));
        }
      );
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }: any) => {
    setIsScanning(false);
    Alert.alert('Scanner', `Cdigo lido: ${data}`);
    // Envia o código para o sistema web processar (ex: bipar produto)
    webViewRef.current?.postMessage(JSON.stringify({ type: 'SCAN_RESULT', data }));
  };

  const NavItem = ({ icon: Icon, label, tab }: any) => (
    <TouchableOpacity 
      style={[styles.navItem, currentTab === tab && styles.navItemActive]}
      onPress={() => {
        setCurrentTab(tab);
        setIsScanning(false);
        if (tab === 'home') setWebViewUrl(WEB_URL);
        if (tab === 'logistica') setWebViewUrl(`${WEB_URL}/logistics`);
        if (tab === 'montagens') setWebViewUrl(`${WEB_URL}/assembly`);
      }}
    >
      <Icon size={24} color={currentTab === tab ? '#2563eb' : '#94a3b8'} strokeWidth={2.5} />
      <Text style={[styles.navText, currentTab === tab && styles.navTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header Nativo Premium */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
           <View style={styles.gpsDot}>
              <View style={[styles.gpsPulse, { backgroundColor: location ? '#10b981' : '#f59e0b' }]} />
           </View>
           <View>
             <Text style={styles.headerSubtitle}>ERP HUB MOBILE</Text>
             <Text style={styles.headerTitle}>Morante Logs</Text>
           </View>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setIsScanning(true)}
          >
            <Camera size={22} color="#1e293b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Bell size={22} color="#1e293b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {isScanning ? (
          <View style={styles.scannerContainer}>
            <CameraView 
              style={StyleSheet.absoluteFillObject} 
              onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
            >
              <View style={styles.overlay}>
                <View style={styles.unfocusedContainer}></View>
                <View style={styles.focusedContainer}>
                  <View style={styles.scanLine} />
                </View>
                <View style={styles.unfocusedContainer}></View>
                <TouchableOpacity style={styles.closeScanner} onPress={() => setIsScanning(false)}>
                   <Text style={styles.closeText}>CANCELAR SCANNER</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>
        ) : (
          <WebView 
            ref={webViewRef}
            source={{ uri: webViewUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
          />
        )}
      </View>

      {/* Barra de Navegao */}
      <View style={styles.bottomNav}>
        <NavItem icon={LayoutGrid} label="Incio" tab="home" />
        <NavItem icon={ClipboardList} label="Logstica" tab="logistica" />
        <NavItem icon={Map} label="Montadores" tab="montagens" />
        <NavItem icon={Settings} label="Ajustes" tab="settings" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerSubtitle: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.2 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  gpsDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  gpsPulse: { width: 8, height: 8, borderRadius: 4 },
  content: { flex: 1, backgroundColor: '#f8fafc' },
  iconButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  bottomNav: {
    height: 75,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingBottom: 15,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navItemActive: { backgroundColor: '#eff6ff', borderRadius: 12, margin: 4 },
  navText: { fontSize: 9, fontWeight: '700', color: '#94a3b8', marginTop: 4 },
  navTextActive: { color: '#2563eb' },
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  unfocusedContainer: { flex: 1 },
  focusedContainer: { height: 250, borderWidth: 2, borderColor: '#fff' },
  scanLine: { height: 2, backgroundColor: '#2563eb', marginHorizontal: 20, marginTop: 125, shadowColor: '#2563eb', shadowRadius: 10, elevation: 5 },
  closeScanner: { padding: 20, alignItems: 'center' },
  closeText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 }
});
