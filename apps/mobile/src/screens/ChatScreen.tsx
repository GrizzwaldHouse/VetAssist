// ChatScreen.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Chat tab — AI chat with PII guard on every keystroke, crisis detection on submit,
//          non-dismissable CrisisLineBanner when crisis detected, AIDisclosureBanner always shown.
import type { FC } from 'react';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AIDisclosureBanner } from '@/components/AIDisclosureBanner';
import { CrisisLineBanner } from '@/components/CrisisLineBanner';
import { PIIWarningModal } from '@/components/PIIWarningModal';
import {
  COLOR_GOLD,
  COLOR_NAVY,
  COLOR_PARCHMENT,
  FONT_SIZE_MD,
  SPACING_MD,
  SPACING_SM,
  BORDER_RADIUS_MD,
} from '@/constants/theme';
import { useCrisisDetector } from '@/hooks/useCrisisDetector';
import { usePIIGuard } from '@/hooks/usePIIGuard';

const SEND_LABEL = 'Send' as const;
const INPUT_PLACEHOLDER = 'Ask about your VA benefits...' as const;

export const ChatScreen: FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [showPIIModal, setShowPIIModal] = useState<boolean>(false);
  const [piiTypes, setPiiTypes] = useState<ReadonlyArray<string>>([]);

  const { scan } = usePIIGuard();
  const { isCrisis, check: checkCrisis } = useCrisisDetector();

  // PII guard runs on every keystroke — never store raw input containing PII
  const handleChangeText = (text: string): void => {
    const { clean, piiDetected, piiTypes: detected } = scan(text);
    if (piiDetected) {
      setPiiTypes(detected);
      setShowPIIModal(true);
      setInputText(clean);
      return;
    }
    setInputText(text);
  };

  const handleSend = (): void => {
    if (inputText.trim().length === 0) return;
    // Crisis check on every submit before any API call
    checkCrisis(inputText);
    if (isCrisis) return;
    // TODO: dispatch to @vetassist/ai ChatHandler via API route /api/chat
    setInputText('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AIDisclosureBanner />
        {isCrisis && <CrisisLineBanner />}
        {/* TODO: render message history here */}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleChangeText}
          placeholder={INPUT_PLACEHOLDER}
          placeholderTextColor={COLOR_PARCHMENT}
          multiline
          accessibilityLabel="Chat input"
        />
        <Pressable style={styles.sendButton} onPress={handleSend} accessibilityRole="button">
          <Text style={styles.sendLabel}>{SEND_LABEL}</Text>
        </Pressable>
      </View>

      <PIIWarningModal
        visible={showPIIModal}
        piiTypes={piiTypes}
        onDismiss={() => setShowPIIModal(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLOR_NAVY },
  scroll: { flex: 1 },
  container: { padding: SPACING_MD },
  inputRow: {
    flexDirection: 'row',
    padding: SPACING_SM,
    borderTopWidth: 1,
    borderTopColor: COLOR_GOLD,
    backgroundColor: COLOR_NAVY,
  },
  input: {
    flex: 1,
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_MD,
    borderWidth: 1,
    borderColor: COLOR_GOLD,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_SM,
    marginRight: SPACING_SM,
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: COLOR_GOLD,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_SM,
    justifyContent: 'center',
  },
  sendLabel: {
    color: COLOR_NAVY,
    fontWeight: 'bold',
    fontSize: FONT_SIZE_MD,
  },
});
