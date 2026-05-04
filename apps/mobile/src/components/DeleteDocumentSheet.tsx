// DeleteDocumentSheet.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Bottom-sheet deletion flow for mobile — confirm → animated progress → certificate

import type { FC } from 'react';
import { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native';
import {
  COLOR_GOLD,
  COLOR_NAVY,
  COLOR_PARCHMENT,
  FONT_SIZE_LG,
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  SPACING_LG,
  SPACING_MD,
  SPACING_SM,
  SPACING_XS,
  BORDER_RADIUS_MD,
} from '@/constants/theme';
import type { DataDestructionResult, DeletionProgress } from '@vetassist/shared-types';

// Display text constants
const SHEET_TITLE           = 'Delete Document' as const;
const CONFIRM_HEADING       = 'Permanently delete this document?' as const;
const CONFIRM_WARNING       = 'This cannot be undone. The document will be overwritten with zeros before deletion. A deletion certificate will be generated.' as const;
const BTN_CANCEL            = 'Cancel' as const;
const BTN_DELETE            = 'Delete permanently' as const;
const BTN_CLOSE             = 'Close' as const;
const BTN_SHARE_CERT        = 'Share certificate' as const;
const PROGRESS_HEADING      = 'Deleting document…' as const;
const DONE_HEADING          = 'Document deleted' as const;
const DONE_SUBTEXT          = 'Your document has been permanently and securely destroyed.' as const;
const CERT_NOTE             = 'Your deletion certificate is ready.' as const;
const ERROR_PREFIX          = 'Error: ' as const;

// Certificate share subject line
const CERT_SHARE_SUBJECT    = 'VetAssist Deletion Certificate' as const;
const CERT_SHARE_BODY_PREFIX = 'Deletion certificate ID: ' as const;

// Danger red — used for the delete button only to signal destructive action
const COLOR_DANGER = '#c00' as const;
const COLOR_WHITE  = '#ffffff' as const;
const COLOR_LIGHT_GRAY = '#f0f0f0' as const;
const COLOR_MID_GRAY   = '#888888' as const;
const COLOR_DARK_GRAY  = '#333333' as const;

type Step = 'confirm' | 'progress' | 'done';

interface DeleteDocumentSheetProps {
  readonly visible: boolean;
  readonly documentId: string;
  readonly documentTitle: string;
  readonly apiBaseUrl: string;
  readonly onClose: () => void;
  readonly onDeleted?: () => void;
}

export const DeleteDocumentSheet: FC<DeleteDocumentSheetProps> = ({
  visible,
  documentId,
  documentTitle,
  apiBaseUrl,
  onClose,
  onDeleted,
}) => {
  const [step, setStep]               = useState<Step>('confirm');
  const [progress, setProgress]       = useState<DeletionProgress | null>(null);
  const [percentComplete, setPercent] = useState(0);
  const [result, setResult]           = useState<DataDestructionResult | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep('confirm');
    setProgress(null);
    setPercent(0);
    setResult(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleDelete = useCallback(() => {
    setStep('progress');
    setError(null);

    void (async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/documents/${documentId}/destroy`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentTitle }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`Server returned ${response.status}`);
        }

        // React Native fetch supports ReadableStream in Hermes via response.body
        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        let   buffer  = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const eventLine = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim();
            const dataLine  = frame.match(/^data:\s*(.+)$/m)?.[1]?.trim();
            if (!eventLine || !dataLine) continue;

            if (eventLine === 'progress') {
              const prog = JSON.parse(dataLine) as DeletionProgress;
              setProgress(prog);
              setPercent(prog.percentComplete);
            } else if (eventLine === 'done') {
              const res = JSON.parse(dataLine) as DataDestructionResult;
              setResult(res);
              setPercent(100);
              setStep('done');
              onDeleted?.();
            } else if (eventLine === 'error') {
              const err = JSON.parse(dataLine) as { error: string };
              throw new Error(err.error);
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unexpected error.';
        setError(`${ERROR_PREFIX}${msg}`);
        setStep('confirm');
      }
    })();
  }, [apiBaseUrl, documentId, documentTitle, onDeleted]);

  const handleShareCertificate = useCallback(async () => {
    if (!result?.certificate) return;
    const cert = result.certificate;
    await Share.share({
      title:   CERT_SHARE_SUBJECT,
      message: `${CERT_SHARE_BODY_PREFIX}${cert.certificateId}\nDocument: ${cert.documentTitle}\nDeleted: ${cert.deletedAt}\nMethod: ${cert.wipeMethod}`,
    });
  }, [result]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.dragHandle} accessibilityElementsHidden />

          <Text style={styles.title}>{SHEET_TITLE}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {step === 'confirm' && (
              <ConfirmView
                documentTitle={documentTitle}
                error={error}
                onDelete={handleDelete}
                onCancel={handleClose}
              />
            )}
            {step === 'progress' && (
              <ProgressView
                progress={progress}
                percentComplete={percentComplete}
              />
            )}
            {step === 'done' && result && (
              <DoneView
                result={result}
                onShareCertificate={handleShareCertificate}
                onClose={handleClose}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Sub-views ────────────────────────────────────────────────────────────────

interface ConfirmViewProps {
  readonly documentTitle: string;
  readonly error: string | null;
  readonly onDelete: () => void;
  readonly onCancel: () => void;
}

function ConfirmView({ documentTitle, error, onDelete, onCancel }: ConfirmViewProps) {
  return (
    <View>
      <Text style={styles.heading}>{CONFIRM_HEADING}</Text>
      <Text style={styles.docTitle}>"{documentTitle}"</Text>
      <Text style={styles.warning}>{CONFIRM_WARNING}</Text>
      {error && <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>}
      <TouchableOpacity style={styles.btnDanger} onPress={onDelete} accessibilityRole="button">
        <Text style={styles.btnDangerText}>{BTN_DELETE}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={onCancel} accessibilityRole="button">
        <Text style={styles.btnSecondaryText}>{BTN_CANCEL}</Text>
      </TouchableOpacity>
    </View>
  );
}

interface ProgressViewProps {
  readonly progress: DeletionProgress | null;
  readonly percentComplete: number;
}

function ProgressView({ progress, percentComplete }: ProgressViewProps) {
  return (
    <View style={styles.progressContainer}>
      <Text style={styles.heading}>{PROGRESS_HEADING}</Text>
      <ActivityIndicator size="large" color={COLOR_DANGER} style={styles.spinner} />
      <View
        style={styles.progressBg}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percentComplete }}
      >
        <View style={[styles.progressBar, { width: `${percentComplete}%` as `${number}%` }]} />
      </View>
      <Text style={styles.progressPercent}>{percentComplete}%</Text>
      {progress && <Text style={styles.progressMsg}>{progress.message}</Text>}
    </View>
  );
}

interface DoneViewProps {
  readonly result: DataDestructionResult;
  readonly onShareCertificate: () => void;
  readonly onClose: () => void;
}

function DoneView({ result, onShareCertificate, onClose }: DoneViewProps) {
  return (
    <View>
      <Text style={styles.doneHeading}>{DONE_HEADING}</Text>
      <Text style={styles.doneSubtext}>{DONE_SUBTEXT}</Text>
      {result.certificate && (
        <>
          <Text style={styles.certNote}>{CERT_NOTE}</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={onShareCertificate} accessibilityRole="button">
            <Text style={styles.btnPrimaryText}>{BTN_SHARE_CERT}</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={styles.btnSecondary} onPress={onClose} accessibilityRole="button">
        <Text style={styles.btnSecondaryText}>{BTN_CLOSE}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: COLOR_PARCHMENT,
    borderTopLeftRadius: BORDER_RADIUS_MD * 2,
    borderTopRightRadius: BORDER_RADIUS_MD * 2,
    padding: SPACING_LG,
    maxHeight: '85%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLOR_MID_GRAY,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING_MD,
  },
  title: {
    color: COLOR_NAVY,
    fontSize: FONT_SIZE_LG,
    fontWeight: 'bold',
    marginBottom: SPACING_MD,
  },
  heading: {
    color: COLOR_NAVY,
    fontSize: FONT_SIZE_MD,
    fontWeight: '600',
    marginBottom: SPACING_SM,
  },
  docTitle: {
    color: COLOR_DARK_GRAY,
    fontStyle: 'italic',
    fontSize: FONT_SIZE_MD,
    marginBottom: SPACING_SM,
  },
  warning: {
    color: COLOR_DARK_GRAY,
    fontSize: FONT_SIZE_SM,
    lineHeight: 20,
    marginBottom: SPACING_MD,
  },
  errorText: {
    color: COLOR_DANGER,
    fontSize: FONT_SIZE_SM,
    marginBottom: SPACING_SM,
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: SPACING_LG,
  },
  spinner: {
    marginVertical: SPACING_MD,
  },
  progressBg: {
    width: '100%',
    height: 10,
    backgroundColor: COLOR_LIGHT_GRAY,
    borderRadius: BORDER_RADIUS_MD,
    overflow: 'hidden',
    marginBottom: SPACING_XS,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLOR_DANGER,
    borderRadius: BORDER_RADIUS_MD,
  },
  progressPercent: {
    color: COLOR_MID_GRAY,
    fontSize: FONT_SIZE_SM,
    marginBottom: SPACING_XS,
  },
  progressMsg: {
    color: COLOR_DARK_GRAY,
    fontSize: FONT_SIZE_SM,
    marginTop: SPACING_SM,
    textAlign: 'center',
  },
  doneHeading: {
    color: '#1a6b1a',
    fontSize: FONT_SIZE_LG,
    fontWeight: 'bold',
    marginBottom: SPACING_SM,
  },
  doneSubtext: {
    color: COLOR_DARK_GRAY,
    fontSize: FONT_SIZE_MD,
    marginBottom: SPACING_MD,
  },
  certNote: {
    color: COLOR_DARK_GRAY,
    fontSize: FONT_SIZE_SM,
    marginBottom: SPACING_SM,
  },
  btnDanger: {
    backgroundColor: COLOR_DANGER,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_MD,
    alignItems: 'center',
    marginBottom: SPACING_SM,
  },
  btnDangerText: {
    color: COLOR_WHITE,
    fontWeight: 'bold',
    fontSize: FONT_SIZE_MD,
  },
  btnPrimary: {
    backgroundColor: COLOR_NAVY,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_MD,
    alignItems: 'center',
    marginBottom: SPACING_SM,
  },
  btnPrimaryText: {
    color: COLOR_GOLD,
    fontWeight: 'bold',
    fontSize: FONT_SIZE_MD,
  },
  btnSecondary: {
    backgroundColor: COLOR_LIGHT_GRAY,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_MD,
    alignItems: 'center',
    marginBottom: SPACING_SM,
  },
  btnSecondaryText: {
    color: COLOR_DARK_GRAY,
    fontSize: FONT_SIZE_MD,
  },
});
