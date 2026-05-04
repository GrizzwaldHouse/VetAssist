// CommunityScreen.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Community tab — veteran stories feed stub with PII guard on all text inputs
import type { FC } from 'react';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PIIWarningModal } from '@/components/PIIWarningModal';
import {
  BORDER_RADIUS_MD,
  COLOR_GOLD,
  COLOR_NAVY,
  COLOR_PARCHMENT,
  FONT_SIZE_LG,
  FONT_SIZE_MD,
  SPACING_LG,
  SPACING_MD,
  SPACING_SM,
} from '@/constants/theme';
import { usePIIGuard } from '@/hooks/usePIIGuard';

const SECTION_TITLE = 'Veteran Community' as const;
const INPUT_PLACEHOLDER = 'Share your experience...' as const;
const SUBMIT_LABEL = 'Submit Story' as const;
const FEED_PLACEHOLDER = 'Community stories load here.' as const;
const DISCLAIMER = 'Personal experience. Results vary.' as const;

export const CommunityScreen: FC = () => {
  const [storyText, setStoryText] = useState<string>('');
  const [showPIIModal, setShowPIIModal] = useState<boolean>(false);
  const [piiTypes, setPiiTypes] = useState<ReadonlyArray<string>>([]);

  const { scan } = usePIIGuard();

  // PII guard on every keystroke — never store raw PII in state
  const handleChangeText = (text: string): void => {
    const { clean, piiDetected, piiTypes: detected } = scan(text);
    if (piiDetected) {
      setPiiTypes(detected);
      setShowPIIModal(true);
      setStoryText(clean);
      return;
    }
    setStoryText(text);
  };

  const handleSubmit = (): void => {
    if (storyText.trim().length === 0) return;
    // TODO: POST to /api/community/stories with PII-clean text
    setStoryText('');
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{SECTION_TITLE}</Text>

      <View style={styles.feedPlaceholder}>
        <Text style={styles.feedText}>{FEED_PLACEHOLDER}</Text>
        {/* TODO: fetch from /api/community/stories and render StoryCard list */}
      </View>

      <TextInput
        style={styles.input}
        value={storyText}
        onChangeText={handleChangeText}
        placeholder={INPUT_PLACEHOLDER}
        placeholderTextColor={COLOR_PARCHMENT}
        multiline
        accessibilityLabel="Story submission input"
      />

      <Pressable style={styles.button} onPress={handleSubmit} accessibilityRole="button">
        <Text style={styles.buttonText}>{SUBMIT_LABEL}</Text>
      </Pressable>

      <Text style={styles.disclaimer}>{DISCLAIMER}</Text>

      <PIIWarningModal
        visible={showPIIModal}
        piiTypes={piiTypes}
        onDismiss={() => setShowPIIModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { backgroundColor: COLOR_NAVY },
  container: { padding: SPACING_LG },
  title: {
    color: COLOR_GOLD,
    fontSize: FONT_SIZE_LG,
    fontWeight: 'bold',
    marginBottom: SPACING_MD,
  },
  feedPlaceholder: {
    borderWidth: 1,
    borderColor: COLOR_GOLD,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_MD,
    marginBottom: SPACING_MD,
    minHeight: 120,
  },
  feedText: {
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_MD,
    opacity: 0.5,
  },
  input: {
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_MD,
    borderWidth: 1,
    borderColor: COLOR_GOLD,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_SM,
    marginBottom: SPACING_MD,
    minHeight: 80,
  },
  button: {
    backgroundColor: COLOR_GOLD,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_MD,
    alignItems: 'center',
    marginBottom: SPACING_MD,
  },
  buttonText: {
    color: COLOR_NAVY,
    fontWeight: 'bold',
    fontSize: FONT_SIZE_MD,
  },
  disclaimer: {
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_MD,
    opacity: 0.5,
    fontStyle: 'italic',
  },
});
