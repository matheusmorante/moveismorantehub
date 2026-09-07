import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { User } from 'lucide-react-native';
import { SectionCard, SectionHeader } from './SectionCard';

interface CustomerSectionProps {
  customer: any;
  dark?: boolean;
}

export function CustomerSection({ customer, dark }: CustomerSectionProps) {
  const contacts = (customer?.additionalContacts || []).filter((contact: any) => contact?.name || contact?.phone);

  return (
    <SectionCard dark={dark}>
      <SectionHeader dark={dark} icon={<User size={18} color="#2563eb" />} title="DADOS DO CLIENTE" />
      <Text style={[styles.strong, dark && styles.light]}>
        {customer?.fullName || customer?.name || 'Cliente Consumidor'}
      </Text>
      {Boolean(customer?.phone) && (
        <Text style={styles.detail}>📞 Telefone principal: {customer.phone}</Text>
      )}
      {contacts.map((contact: any, index: number) => (
        <View key={index} style={[styles.contact, dark && styles.contactDark]}>
          <Text style={styles.contactName}>{contact.name || 'Contato adicional'}</Text>
          <Text style={[styles.contactPhone, dark && styles.light]}>📞 {contact.phone || 'Telefone não informado'}</Text>
        </View>
      ))}
      {Boolean(customer?.document) && (
        <Text style={styles.detail}>📄 CPF / CNPJ: {customer.document}</Text>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  strong: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  detail: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  light: { color: '#f8fafc' },
  contact: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 11, padding: 10, gap: 3 },
  contactDark: { backgroundColor: '#0f172a', borderColor: '#334155' },
  contactName: { fontSize: 10, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase' },
  contactPhone: { fontSize: 13, fontWeight: '800', color: '#334155' },
});
