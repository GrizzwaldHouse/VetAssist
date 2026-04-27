// DocumentDropZone.tsx
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Drag-and-drop document upload zone — sharp-cornered, mission-briefing document aesthetic.
//          Supports multi-file drop, thumbnail tray with labels, PII event callback.

import React, { useCallback, useId, useRef, useState } from 'react';

// Accepted MIME types per project configuration
const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/tiff',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.heic,.tiff,.docx,.txt';
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB — from project config

interface DropFile {
  readonly id: string;
  readonly file: File;
  readonly objectUrl: string;
  label: string;
}

interface DocumentDropZoneProps {
  // Called with accepted files when the veteran confirms the tray
  readonly onFilesAccepted: (files: File[]) => void;
  // Called when a file exceeds the size limit — surface to the veteran as a friendly error
  readonly onOversizedFile?: (fileName: string) => void;
  readonly disabled?: boolean;
}

function generateId(): string {
  return `dropfile-${Math.random().toString(36).slice(2, 9)}`;
}

function isTypeAccepted(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type) ||
    // HEIC files often report empty MIME type on Windows
    file.name.toLowerCase().endsWith('.heic');
}

const dropZoneBase: React.CSSProperties = {
  border: '2px dashed var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  backgroundColor: 'var(--va-color-field-black)',
  padding: '40px 32px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  transition: `border-color var(--va-duration-fast), background-color var(--va-duration-fast)`,
  outline: 'none',
  position: 'relative',
};

const dropZoneActive: React.CSSProperties = {
  borderColor: 'var(--va-color-old-glory-red)',
  // Darkened field black for drag-active state — 4% darker than field-black token
  backgroundColor: 'color-mix(in srgb, var(--va-color-field-black) 85%, var(--va-color-old-glory-red) 15%)',
};

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-h4)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--va-color-text-primary)',
  margin: '12px 0 4px',
};

const subTextStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-secondary)',
  textAlign: 'center',
};

const thumbnailTrayStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  gap: '8px',
  overflowX: 'auto',
  marginTop: '20px',
  paddingBottom: '4px',
};

const thumbnailCardStyle: React.CSSProperties = {
  flexShrink: 0,
  width: '80px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const thumbnailBoxStyle: React.CSSProperties = {
  width: '80px',
  height: '80px',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  backgroundColor: 'var(--va-color-aged-canvas)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '28px',
  color: 'var(--va-color-text-secondary)',
  overflow: 'hidden',
};

const labelInputStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'var(--va-font-body)',
  fontSize: '0.61rem',
  color: 'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-field-black)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '3px 6px',
  outline: 'none',
};

const confirmBtnStyle: React.CSSProperties = {
  marginTop: '16px',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  padding: '0 24px',
  height: '48px',
  minWidth: '48px',
  borderRadius: 'var(--va-radius-card)',
  border: 'none',
  backgroundColor: 'var(--va-color-old-glory-red)',
  color: 'var(--va-color-crisis-text)',
  cursor: 'pointer',
};

export const DocumentDropZone = React.forwardRef<HTMLDivElement, DocumentDropZoneProps>(
  ({ onFilesAccepted, onOversizedFile, disabled = false }, ref) => {
    const [isDragActive, setIsDragActive] = useState(false);
    const [dropFiles, setDropFiles]       = useState<DropFile[]>([]);
    const fileInputId = useId();
    const inputRef    = useRef<HTMLInputElement>(null);

    const processIncomingFiles = useCallback((incoming: FileList | File[]) => {
      const list = Array.from(incoming);
      const accepted: DropFile[] = [];

      for (const file of list) {
        if (!isTypeAccepted(file)) continue;
        if (file.size > MAX_FILE_BYTES) {
          onOversizedFile?.(file.name);
          continue;
        }
        accepted.push({
          id:        generateId(),
          file,
          objectUrl: URL.createObjectURL(file),
          label:     file.name.replace(/\.[^.]+$/, ''),
        });
      }

      // Revoke previous object URLs to avoid memory leaks before replacing
      setDropFiles(prev => {
        prev.forEach(df => URL.revokeObjectURL(df.objectUrl));
        return accepted;
      });
    }, [onOversizedFile]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(false);
      if (disabled) return;
      processIncomingFiles(e.dataTransfer.files);
    }, [disabled, processIncomingFiles]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) setIsDragActive(true);
    }, [disabled]);

    const handleDragLeave = useCallback(() => setIsDragActive(false), []);

    const handleClick = useCallback(() => {
      if (!disabled) inputRef.current?.click();
    }, [disabled]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!disabled) inputRef.current?.click();
      }
    }, [disabled]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) processIncomingFiles(e.target.files);
    }, [processIncomingFiles]);

    const handleLabelChange = useCallback((id: string, value: string) => {
      setDropFiles(prev =>
        prev.map(df => df.id === id ? { ...df, label: value } : df)
      );
    }, []);

    const handleConfirm = useCallback(() => {
      onFilesAccepted(dropFiles.map(df => df.file));
      setDropFiles(prev => {
        prev.forEach(df => URL.revokeObjectURL(df.objectUrl));
        return [];
      });
    }, [dropFiles, onFilesAccepted]);

    const handleRemove = useCallback((id: string) => {
      setDropFiles(prev => {
        const target = prev.find(df => df.id === id);
        if (target) URL.revokeObjectURL(target.objectUrl);
        return prev.filter(df => df.id !== id);
      });
    }, []);

    const mergedStyle: React.CSSProperties = isDragActive
      ? { ...dropZoneBase, ...dropZoneActive }
      : dropZoneBase;

    const iconForFile = (file: File): string => {
      if (file.type === 'application/pdf') return '📄';
      if (file.type.startsWith('image/')) return '🖼';
      if (file.type.includes('word')) return '📝';
      return '📋';
    };

    return (
      <div ref={ref}>
        {/* Drop target */}
        <div
          style={mergedStyle}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Document upload zone. Click or drag files here."
          aria-disabled={disabled}
        >
          {/* Hidden file input — real pick mechanism */}
          <input
            ref={inputRef}
            id={fileInputId}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            onChange={handleInputChange}
            style={{ display: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          />

          {/* Document icon with star watermark */}
          <span style={{ fontSize: '40px', position: 'relative' }} aria-hidden="true">
            📋
            <span style={{
              position: 'absolute', top: '-4px', right: '-8px',
              fontSize: '16px', opacity: 0.25, color: 'var(--va-color-star-white)',
            }}>★</span>
          </span>

          <p style={headingStyle}>Drop Your Documents Here</p>
          <p style={subTextStyle}>
            PDF, JPG, PNG, HEIC, TIFF, DOCX, TXT — Max 25 MB per file
          </p>
        </div>

        {/* Thumbnail tray — appears when files are selected */}
        {dropFiles.length > 0 && (
          <div>
            <div style={thumbnailTrayStyle} role="list" aria-label="Selected documents">
              {dropFiles.map(df => (
                <div key={df.id} style={thumbnailCardStyle} role="listitem">
                  <div style={thumbnailBoxStyle} aria-hidden="true">
                    {df.file.type.startsWith('image/')
                      ? <img
                          src={df.objectUrl}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      : iconForFile(df.file)
                    }
                  </div>
                  <input
                    type="text"
                    value={df.label}
                    onChange={e => handleLabelChange(df.id, e.target.value)}
                    style={labelInputStyle}
                    aria-label={`Label for ${df.file.name}`}
                    maxLength={60}
                  />
                  <button
                    onClick={() => handleRemove(df.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '0.61rem', color: 'var(--va-color-text-secondary)',
                      fontFamily: 'var(--va-font-heading)', letterSpacing: '0.04em',
                      textTransform: 'uppercase', padding: '2px 0',
                    }}
                    aria-label={`Remove ${df.file.name}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button
              style={confirmBtnStyle}
              onClick={handleConfirm}
              aria-label={`Confirm and analyze ${dropFiles.length} document${dropFiles.length !== 1 ? 's' : ''}`}
            >
              Analyze {dropFiles.length} Document{dropFiles.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    );
  }
);

DocumentDropZone.displayName = 'DocumentDropZone';
