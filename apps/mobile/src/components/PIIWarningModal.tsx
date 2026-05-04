// PIIWarningModal.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Modal shown when PII is detected in user input. Displays type labels only —
//          never the actual PII values. Single dismiss button.
import type { FC } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BORDER_RADIUS_MD,
  COLOR_AMBER,
  COLOR_NAVY,
  COLOR_PARCHMENT,
  FONT_SIZE_MD,
  FONT_SIZE_LG,
  SPACING_LG,
  SPACING_MD,
  SPACING_SM,
} from '@/constants/theme';

const DISMISS_LABEL = 'Got it' as const;
const MODAL_TITLE = 'Sensitive Information Detected' as const;
const MODAL_BODY = 'The following was found and removed before processing:' as const;

interface PIIWarningModalProps {
  readonly visible: boolean;
  readonly piiTypes: ReadonlyArray<string>;
  readonly onDismiss: () => void;
}

export const PIIWarningModal: FC<PIIWarningModalProps> = ({
  visible,
  piiTypes,
  onDismiss,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onDismiss}
    accessibilityViewIsModal
  >
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>{MODAL_TITLE}</Text>
        <Text style={styles.body}>{MODAL_BODY}</Text>
        {piiTypes.map((type) => (
          <Text key={type} style={styles.typeLabel}>
            • {type}
          </Text>
        ))}
        <Pressable style={styles.button} onPress={onDismiss} accessibilityRole="button">
          <Text style={styles.buttonText}>{DISMISS_LABEL}</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: COLOR_NAVY,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_LG,
    width: '85%',
    borderWidth: 1,
    borderColor: COLOR_AMBER,
  },
  title: {
    color: COLOR_AMBER,
    fontSize: FONT_SIZE_LG,
    fontWeight: 'bold',
    marginBottom: SPACING_SM,
  },
  body: {
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_MD,
    marginBottom: SPACING_SM,
  },
  typeLabel: {
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_MD,
    marginBottom: SPACING_SM,
  },
  button: {
    marginTop: SPACING_MD,
    backgroundColor: COLOR_AMBER,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_MD,
    alignItems: 'center',
  },
  buttonText: {
    color: COLOR_NAVY,
    fontWeight: 'bold',
    fontSize: FONT_SIZE_MD,
  },
});
