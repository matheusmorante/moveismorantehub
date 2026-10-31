import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { ExternalLink, FileText, Image as ImageIcon, Paperclip, Trash2, UploadCloud } from 'lucide-react-native';

interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}

interface PurchaseAttachmentsSectionProps {
  attachments: string[];
  isUploading: boolean;
  colors: ThemeColors;
  onAdd: () => void;
  onOpen: (url: string) => void;
  onRemove: (index: number) => void;
}

const getAttachmentLabel = (url: string, index: number) => {
  const extension = url.split('?')[0]?.split('.').pop()?.toLowerCase();
  return extension === 'pdf' ? `Documento PDF ${index + 1}` : `Imagem ${index + 1}`;
};

const isPdf = (url: string) => url.split('?')[0]?.toLowerCase().endsWith('.pdf');

export const PurchaseAttachmentsSection: React.FC<PurchaseAttachmentsSectionProps> = ({
  attachments,
  isUploading,
  colors,
  onAdd,
  onOpen,
  onRemove,
}) => (
  <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.heading}>
      <View style={styles.titleRow}>
        <Paperclip size={16} color={colors.muted} />
        <Text style={[styles.title, { color: colors.text }]}>Anexos do pedido</Text>
      </View>
      <Text style={[styles.counter, { color: colors.muted }]}>{attachments.length}/5</Text>
    </View>

    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Anexar documento PDF ou imagem"
      accessibilityHint="Você pode anexar até cinco arquivos ao pedido."
      disabled={isUploading || attachments.length >= 5}
      onPress={onAdd}
      style={[
        styles.uploadButton,
        { borderColor: colors.border, backgroundColor: colors.bg },
        (isUploading || attachments.length >= 5) && styles.disabled,
      ]}
    >
      {isUploading ? (
        <ActivityIndicator color="#2563eb" />
      ) : (
        <UploadCloud size={20} color="#2563eb" />
      )}
      <View style={styles.uploadCopy}>
        <Text style={[styles.uploadTitle, { color: colors.text }]}>
          {isUploading ? 'Enviando arquivos…' : 'Adicionar documento ou imagem'}
        </Text>
        <Text style={[styles.uploadSubtitle, { color: colors.muted }]}>PDF ou imagem · máximo de 5 arquivos</Text>
      </View>
    </TouchableOpacity>

    {attachments.map((url, index) => {
      const label = getAttachmentLabel(url, index);
      const Icon = isPdf(url) ? FileText : ImageIcon;
      return (
        <View key={`${url}-${index}`} style={[styles.attachment, { borderColor: colors.border }]}>
          <Icon size={18} color={isPdf(url) ? '#dc2626' : '#2563eb'} />
          <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
            {label}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${label}`}
            disabled={isUploading}
            onPress={() => onOpen(url)}
            style={styles.iconAction}
          >
            <ExternalLink size={17} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Remover ${label}`}
            disabled={isUploading}
            onPress={() => onRemove(index)}
            style={styles.iconAction}
          >
            <Trash2 size={17} color="#dc2626" />
          </TouchableOpacity>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontSize: 14, fontWeight: '900' },
  counter: { fontSize: 12, fontWeight: '800' },
  uploadButton: {
    minHeight: 64,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  uploadCopy: { flex: 1, gap: 3 },
  uploadTitle: { fontSize: 12, fontWeight: '800' },
  uploadSubtitle: { fontSize: 10 },
  disabled: { opacity: 0.55 },
  attachment: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  attachmentName: { flex: 1, fontSize: 12, fontWeight: '700' },
  iconAction: { padding: 5 },
});
