import type React from 'react';
import { Text, View } from 'react-native';
import { styles } from './mobileMoveVariationModal.styles';

interface Props {
  mutationBlocked: boolean;
  blockedMessage: string;
  queryReady: boolean;
  queryError: string;
  isOnlyVariation: boolean;
}

export const MobileMoveVariationStatusNotices: React.FC<Props> = ({
  mutationBlocked,
  blockedMessage,
  queryReady,
  queryError,
  isOnlyVariation,
}) => (
  <>
    {mutationBlocked ? (
      <View style={styles.conflict}>
        <Text style={styles.conflictTitle}>Confirme o cadastro antes de continuar</Text>
        <Text style={styles.conflictText}>
          {blockedMessage} Feche esta janela, atualize a lista e confira a variação antes de tentar novamente. O movimento seguirá bloqueado nesta sessão.
        </Text>
      </View>
    ) : null}
    {queryReady && !queryError ? (
      isOnlyVariation ? (
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>Esta é a única variação deste produto.</Text>
          <Text style={styles.warningText}>
            Ao movê-la, o produto pai de origem ficará sem variações e será removido. A
            variação e seu histórico permanecerão.
          </Text>
        </View>
      ) : (
        <View style={styles.info}>
          <Text style={styles.infoText}>
            O nome passará a usar o novo produto pai e os valores das características. As fotos
            vinculadas à variação acompanham a mudança.
          </Text>
        </View>
      )
    ) : null}
  </>
);
