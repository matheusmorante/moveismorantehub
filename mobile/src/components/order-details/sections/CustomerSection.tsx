import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Mail, MessageCircle, Phone, User, FileText, UserCheck } from 'lucide-react-native';
import { SectionCard, SectionHeader } from './SectionCard';
import { toTitleCase } from '../../../utils/orderUtils';

interface CustomerSectionProps {
  customer: any;
  seller?: string;
  dark?: boolean;
}

export function CustomerSection({ customer, seller, dark }: CustomerSectionProps) {
  const contacts = (customer?.additionalContacts || []).filter(
    (contact: any) => contact?.name || contact?.phone
  );
  const customerObservation = String(
    customer?.observations || customer?.observation || customer?.notes || ''
  ).trim();

  const cpfCnpj = customer?.cpfCnpj || customer?.document || customer?.cpf || customer?.cnpj;
  const email = customer?.email;

  const openWhatsApp = (phoneStr: string) => {
    const digits = String(phoneStr || '').replace(/\D/g, '');
    if (!digits) return;
    const finalPhone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
    Linking.openURL(`https://wa.me/${finalPhone}`).catch(() => {});
  };

  return (
    <SectionCard dark={dark}>
      <SectionHeader
        dark={dark}
        icon={<User size={18} color="#2563eb" />}
        title="DADOS DO CLIENTE"
      />
      <Text style={[styles.strong, dark && styles.light]}>
        {toTitleCase(customer?.fullName || customer?.name || 'Cliente Consumidor')}
      </Text>


      {Boolean(customer?.phone) && (
        <View style={[styles.phoneRow, dark && styles.phoneRowDark]}>
          <View style={{ flex: 1, gap: 1 }}>
            <View style={styles.inline}>
              <Phone size={13} color="#2563eb" />
              <Text style={styles.phoneLabel}>Telefone Principal</Text>
            </View>
            <Text style={[styles.phoneValue, dark && styles.light]}>{customer.phone}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openWhatsApp(customer.phone)}
            style={styles.whatsappButton}
            accessibilityLabel="Conversar no WhatsApp"
          >
            <MessageCircle size={14} color="#ffffff" />
            <Text style={styles.whatsappButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      )}

      {Boolean(email) && (
        <View style={styles.inline}>
          <Mail size={13} color="#64748b" />
          <Text style={[styles.detail, dark && styles.light]}>E-mail: {email}</Text>
        </View>
      )}

      {Boolean(cpfCnpj) && (
        <View style={styles.inline}>
          <FileText size={13} color="#64748b" />
          <Text style={[styles.detail, dark && styles.light]}>CPF / CNPJ: {cpfCnpj}</Text>
        </View>
      )}

      {Boolean(seller) && (
        <View style={styles.inline}>
          <UserCheck size={13} color="#2563eb" />
          <Text style={[styles.detail, dark && styles.light]}>
            Vendedor: <Text style={styles.sellerHighlight}>{seller}</Text>
          </Text>
        </View>
      )}

      {contacts.map((contact: any, index: number) => (
        <View key={index} style={[styles.contact, dark && styles.contactDark]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactName}>{contact.name || 'Contato adicional'}</Text>
            <Text style={[styles.contactPhone, dark && styles.light]}>
              {contact.phone || 'Telefone não informado'}
            </Text>
          </View>
          {Boolean(contact.phone) && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openWhatsApp(contact.phone)}
              style={styles.whatsappMiniButton}
              accessibilityLabel="Conversar no WhatsApp"
            >
              <MessageCircle size={12} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      ))}

      {customerObservation ? (
        <View style={[styles.observationBox, dark && styles.observationBoxDark]}>
          <Text style={styles.observationTitle}>OBSERVAÇÕES DO CLIENTE</Text>
          <Text style={[styles.observationText, dark && styles.light]}>{customerObservation}</Text>
        </View>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  strong: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  detail: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  light: { color: '#f8fafc' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  phoneRowDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  phoneLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phoneValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#25D366',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  whatsappButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
  },
  whatsappMiniButton: {
    backgroundColor: '#25D366',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerHighlight: {
    fontWeight: '800',
    color: '#2563eb',
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 11,
    padding: 10,
    gap: 6,
  },
  contactDark: { backgroundColor: '#0f172a', borderColor: '#334155' },
  contactName: { fontSize: 10, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase' },
  contactPhone: { fontSize: 13, fontWeight: '800', color: '#334155' },
  observationBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 11,
    padding: 10,
    gap: 3,
  },
  observationBoxDark: { backgroundColor: '#172554', borderColor: '#1d4ed8' },
  observationTitle: { fontSize: 9, fontWeight: '900', color: '#2563eb', letterSpacing: 0.5 },
  observationText: { fontSize: 12, fontWeight: '700', color: '#334155', lineHeight: 17 },
});
