import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface Props {
  collaborators: { id: string; name: string }[];
  selectedCollaboratorId: string;
  onSelectCollaborator: (id: string, name: string) => void;
  isDarkMode?: boolean;
}

export const TransactionCollaboratorSelector: React.FC<Props> = ({
  collaborators,
  selectedCollaboratorId,
  onSelectCollaborator,
  isDarkMode,
}) => {
  return (
    <View>
      <Text style={[styles.label, isDarkMode && styles.labelDark]}>Colaborador / Funcionário</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {collaborators.map(collab => (
          <TouchableOpacity
            key={collab.id}
            style={[styles.chip, selectedCollaboratorId === collab.id && styles.chipActive]}
            onPress={() => {
              if (selectedCollaboratorId === collab.id) {
                onSelectCollaborator('', '');
              } else {
                onSelectCollaborator(collab.id, collab.name);
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, selectedCollaboratorId === collab.id && styles.chipTextActive]}>
              {collab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 10,
    marginBottom: 6,
  },
  labelDark: {
    color: '#cbd5e1',
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#3b82f6',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
  },
});
