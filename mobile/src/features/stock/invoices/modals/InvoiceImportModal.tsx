import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { X, ScanBarcode, UploadCloud, Search } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

interface Props {
    visible: boolean;
    isDarkMode: boolean;
    onClose: () => void;
    onConsultSefaz?: (accessKey: string) => void;
    onUploadXml?: (file: any) => void;
}

export const InvoiceImportModal: React.FC<Props> = ({ visible, isDarkMode, onClose, onConsultSefaz, onUploadXml }) => {
    const [accessKey, setAccessKey] = useState('');

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/xml', 'text/xml'],
            });
            if (result.canceled === false && result.assets && result.assets.length > 0) {
                if (onUploadXml) onUploadXml(result.assets[0]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const isAccessKeyValid = accessKey.replace(/\D/g, '').length === 44;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                style={[styles.container, isDarkMode && styles.containerDark]}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={[styles.header, isDarkMode && styles.headerDark]}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.iconBox, isDarkMode && styles.iconBoxDark]}>
                            <UploadCloud size={20} color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
                        </View>
                        <View>
                            <Text style={[styles.title, isDarkMode && styles.textDark]}>Importar XML da NF-e</Text>
                            <Text style={[styles.subtitle, isDarkMode && styles.textMutedDark]}>Importe o arquivo XML ou consulte a chave.</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    
                    <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
                        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                            Consultar Chave de Acesso
                        </Text>
                        
                        <View style={styles.inputRow}>
                            <View style={[styles.inputWrapper, isDarkMode && styles.inputWrapperDark]}>
                                <TextInput
                                    style={[styles.input, isDarkMode && styles.textDark]}
                                    placeholder="Digite os 44 dígitos..."
                                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                                    keyboardType="numeric"
                                    maxLength={44}
                                    value={accessKey}
                                    onChangeText={(text) => setAccessKey(text.replace(/\D/g, ''))}
                                />
                                <TouchableOpacity style={styles.scanBtn} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                    <ScanBarcode size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={[
                                styles.consultBtn, 
                                isAccessKeyValid ? styles.consultBtnActive : styles.consultBtnDisabled,
                                isDarkMode && !isAccessKeyValid && styles.consultBtnDisabledDark
                            ]}
                            disabled={!isAccessKeyValid}
                            onPress={() => onConsultSefaz && onConsultSefaz(accessKey)}
                        >
                            <Search size={18} color={isAccessKeyValid ? '#ffffff' : (isDarkMode ? '#64748b' : '#94a3b8')} />
                            <Text style={[
                                styles.consultBtnText, 
                                isAccessKeyValid ? styles.consultBtnTextActive : styles.consultBtnTextDisabled,
                                isDarkMode && !isAccessKeyValid && styles.consultBtnTextDisabledDark
                            ]}>
                                Consultar no SEFAZ
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.sectionHeaderSpacing}>
                        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                            Arquivo XML da NF-e
                        </Text>
                    </View>
                    <TouchableOpacity 
                        style={[styles.uploadArea, isDarkMode && styles.uploadAreaDark]}
                        onPress={handlePickDocument}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.uploadIconCircle, isDarkMode && styles.uploadIconCircleDark]}>
                            <UploadCloud size={28} color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
                        </View>
                        <Text style={[styles.uploadTitle, isDarkMode && styles.textDark]}>
                            Toque para escolher o arquivo
                        </Text>
                        <Text style={[styles.uploadSubtitle, isDarkMode && styles.textMutedDark]}>
                            Formato aceito: XML oficial da NF-e
                        </Text>
                    </TouchableOpacity>

                </ScrollView>

                <View style={[styles.footer, isDarkMode && styles.footerDark]}>
                    <TouchableOpacity style={[styles.cancelBtn, isDarkMode && styles.cancelBtnDark]} onPress={onClose}>
                        <Text style={[styles.cancelBtnText, isDarkMode && styles.textDark]}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    containerDark: { backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerDark: { backgroundColor: '#1e293b', borderBottomColor: '#334155' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    iconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
    iconBoxDark: { backgroundColor: '#172554' },
    title: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
    subtitle: { fontSize: 12, color: '#64748b' },
    closeBtn: { padding: 4 },
    content: { padding: 20, paddingBottom: 40 },
    sectionCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24 },
    sectionCardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 16 },
    sectionHeaderSpacing: { marginBottom: 12, paddingHorizontal: 4 },
    inputRow: { marginBottom: 16 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, backgroundColor: '#ffffff', height: 48 },
    inputWrapperDark: { borderColor: '#475569', backgroundColor: '#0f172a' },
    input: { flex: 1, height: '100%', paddingHorizontal: 16, fontSize: 15, color: '#0f172a' },
    scanBtn: { paddingHorizontal: 16, height: '100%', justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#e2e8f0' },
    consultBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, gap: 8 },
    consultBtnActive: { backgroundColor: '#2563eb' },
    consultBtnDisabled: { backgroundColor: '#e2e8f0' },
    consultBtnDisabledDark: { backgroundColor: '#334155' },
    consultBtnText: { fontSize: 15, fontWeight: '700' },
    consultBtnTextActive: { color: '#ffffff' },
    consultBtnTextDisabled: { color: '#94a3b8' },
    consultBtnTextDisabledDark: { color: '#64748b' },
    uploadArea: { borderWidth: 2, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 16, backgroundColor: '#ffffff', padding: 32, alignItems: 'center', justifyContent: 'center' },
    uploadAreaDark: { borderColor: '#475569', backgroundColor: '#1e293b' },
    uploadIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    uploadIconCircleDark: { backgroundColor: '#172554' },
    uploadTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
    uploadSubtitle: { fontSize: 13, color: '#64748b' },
    footer: { padding: 20, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingBottom: Platform.OS === 'ios' ? 40 : 20, alignItems: 'flex-end' },
    footerDark: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
    cancelBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff' },
    cancelBtnDark: { borderColor: '#475569', backgroundColor: '#1e293b' },
    cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#334155' },
    textDark: { color: '#f8fafc' },
    textMutedDark: { color: '#94a3b8' },
});
