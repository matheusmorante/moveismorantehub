import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  dark?: boolean;
}

export const SectionHeader = ({ icon, title, dark }: SectionHeaderProps) => (
  <View style={styles.header}>
    {icon}
    <Text style={[styles.title, dark && styles.light]}>{title}</Text>
  </View>
);

interface SectionCardProps {
  children: ReactNode;
  dark?: boolean;
}

export const SectionCard = ({ children, dark }: SectionCardProps) => (
  <View style={[styles.card, dark && styles.cardDark]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
  },
  light: {
    color: '#f8fafc',
  },
});
