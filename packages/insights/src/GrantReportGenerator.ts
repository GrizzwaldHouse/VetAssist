// GrantReportGenerator.ts
// Developer: Marcus Daley
// Date: 2026-05-01
// Purpose: Generates a PDF grant report summarising anonymous VetAssist usage aggregates

import type { GrantReport } from '@vetassist/shared-types';

// PDF structural constants — these are PDF spec literals, not magic strings
const PDF_HEADER         = '%PDF-1.4\n';
const PDF_FONT_HELVETICA = '/F1 /Helvetica';
const PDF_FONT_BOLD      = '/F2 /Helvetica-Bold';
const PDF_PAGE_WIDTH     = 612;   // US Letter points
const PDF_PAGE_HEIGHT    = 792;
const PDF_MARGIN_LEFT    = 60;
const PDF_BODY_Y_START   = 700;
const PDF_LINE_HEIGHT    = 20;
const PDF_TITLE_SIZE     = 18;
const PDF_LABEL_SIZE     = 11;
const PDF_VALUE_SIZE     = 11;
const PDF_FOOTER_SIZE    = 9;
const PDF_FOOTER_Y       = 50;

// Visual label strings — no magic strings in render logic
const REPORT_TITLE    = 'VETASSIST IMPACT GRANT REPORT';
const REPORT_SUBTITLE = 'Anonymous Usage Aggregates — Educational Platform';
const LABEL_PERIOD    = 'Reporting Period:';
const LABEL_VETERANS  = 'Veterans Served:';
const LABEL_DOCS      = 'Documents Reviewed:';
const LABEL_BENEFITS  = 'Benefits Discovered:';
const LABEL_DECISIONS = 'Decision Letters Analyzed:';
const LABEL_CRISIS    = 'Crisis Detections Handled:';
const LABEL_ACCESS    = 'Accessibility Sessions:';
const LABEL_STORIES   = 'Community Stories Submitted:';
const FOOTER_TEXT     = 'All data is anonymous aggregate usage. No personally identifiable information is included. VetAssist is an educational platform — not a law firm.';

export class GrantReportGenerator {
  // Returns base64-encoded PDF bytes for the given grant report
  buildPdf(report: GrantReport): string {
    const rows = this.buildRows(report);
    const pdfBytes = this.buildPdfDocument(rows);
    return Buffer.from(pdfBytes).toString('base64');
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private buildRows(report: GrantReport): readonly { label: string; value: string }[] {
    return [
      { label: LABEL_PERIOD,    value: `${report.periodStart} — ${report.periodEnd}` },
      { label: LABEL_VETERANS,  value: String(report.aggregates.veteransServed) },
      { label: LABEL_DOCS,      value: String(report.aggregates.documentsReviewed) },
      { label: LABEL_BENEFITS,  value: String(report.aggregates.benefitsDiscovered) },
      { label: LABEL_DECISIONS, value: String(report.aggregates.decisionLettersAnalyzed) },
      { label: LABEL_CRISIS,    value: String(report.aggregates.crisisDetections) },
      { label: LABEL_ACCESS,    value: String(report.aggregates.accessibilitySessions) },
      { label: LABEL_STORIES,   value: String(report.aggregates.communityStoriesSubmitted) },
    ] as const;
  }

  // Builds a minimal but valid PDF-1.4 byte string without external dependencies
  private buildPdfDocument(
    lines: readonly { label: string; value: string }[],
  ): string {
    const contentLines: string[] = [];

    // Title block
    contentLines.push(
      `BT`,
      `${PDF_FONT_BOLD} ${PDF_TITLE_SIZE} Tf`,
      `${PDF_MARGIN_LEFT} ${PDF_BODY_Y_START} Td`,
      `(${this.escapePdf(REPORT_TITLE)}) Tj`,
      `ET`,
    );

    // Subtitle
    contentLines.push(
      `BT`,
      `${PDF_FONT_HELVETICA} ${PDF_LABEL_SIZE} Tf`,
      `${PDF_MARGIN_LEFT} ${PDF_BODY_Y_START - PDF_LINE_HEIGHT} Td`,
      `(${this.escapePdf(REPORT_SUBTITLE)}) Tj`,
      `ET`,
    );

    // Separator rule — drawn as a thin rectangle
    const ruleY = PDF_BODY_Y_START - PDF_LINE_HEIGHT * 2;
    contentLines.push(
      `${PDF_MARGIN_LEFT} ${ruleY} ${PDF_PAGE_WIDTH - PDF_MARGIN_LEFT * 2} 1 re f`,
    );

    // Field rows — label bold, value regular, stacked vertically
    lines.forEach((row, idx) => {
      const yLabel = ruleY - PDF_LINE_HEIGHT * 1.5 - idx * PDF_LINE_HEIGHT * 2;
      const yValue = yLabel - PDF_LINE_HEIGHT;
      contentLines.push(
        `BT`,
        `${PDF_FONT_BOLD} ${PDF_LABEL_SIZE} Tf`,
        `${PDF_MARGIN_LEFT} ${yLabel} Td`,
        `(${this.escapePdf(row.label)}) Tj`,
        `ET`,
        `BT`,
        `${PDF_FONT_HELVETICA} ${PDF_VALUE_SIZE} Tf`,
        `${PDF_MARGIN_LEFT + 10} ${yValue} Td`,
        `(${this.escapePdf(row.value)}) Tj`,
        `ET`,
      );
    });

    // Footer
    contentLines.push(
      `BT`,
      `${PDF_FONT_HELVETICA} ${PDF_FOOTER_SIZE} Tf`,
      `${PDF_MARGIN_LEFT} ${PDF_FOOTER_Y} Td`,
      `(${this.escapePdf(FOOTER_TEXT)}) Tj`,
      `ET`,
    );

    const contentStream = contentLines.join('\n');

    // Build minimal PDF object graph: header → catalog → pages → page → font → content
    const objects: string[] = [];
    let objNum = 1;

    const catalogRef  = objNum++;
    const pagesRef    = objNum++;
    const pageRef     = objNum++;
    const fontHelvRef = objNum++;
    const fontBoldRef = objNum++;
    const contentRef  = objNum++;

    objects.push(this.pdfObj(catalogRef, `<< /Type /Catalog /Pages ${pagesRef} 0 R >>`));
    objects.push(this.pdfObj(pagesRef,   `<< /Type /Pages /Kids [${pageRef} 0 R] /Count 1 >>`));
    objects.push(this.pdfObj(pageRef,
      `<< /Type /Page /Parent ${pagesRef} 0 R ` +
      `/MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] ` +
      `/Contents ${contentRef} 0 R ` +
      `/Resources << /Font << ${PDF_FONT_HELVETICA.split(' ')[0]} ${fontHelvRef} 0 R ${PDF_FONT_BOLD.split(' ')[0]} ${fontBoldRef} 0 R >> >> >>`
    ));
    objects.push(this.pdfObj(fontHelvRef, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`));
    objects.push(this.pdfObj(fontBoldRef, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`));

    const streamLen = contentStream.length;
    objects.push(this.pdfObj(contentRef,
      `<< /Length ${streamLen} >>\nstream\n${contentStream}\nendstream`
    ));

    // Build xref table for PDF readers
    let runningOffset = PDF_HEADER.length;
    const offsets: number[] = [0]; // object 0 is always free

    // Recalculate real offsets by walking the rendered objects
    const renderedObjects = objects.map((obj) => {
      offsets.push(runningOffset);
      runningOffset += obj.length;
      return obj;
    });

    const xrefOffset = PDF_HEADER.length + renderedObjects.join('').length;
    const totalObjects = objects.length + 1; // +1 for free entry 0

    const xrefEntries = [`0000000000 65535 f \n`];
    // Skip the placeholder 0 at index 0 — real objects start at index 1
    for (let i = 1; i < offsets.length; i++) {
      xrefEntries.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    }

    const xref =
      `xref\n0 ${totalObjects}\n` +
      xrefEntries.join('') +
      `trailer\n<< /Size ${totalObjects} /Root ${catalogRef} 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF`;

    return PDF_HEADER + renderedObjects.join('') + xref;
  }

  private pdfObj(num: number, content: string): string {
    return `${num} 0 obj\n${content}\nendobj\n`;
  }

  // Escapes characters that are special inside PDF string literals
  private escapePdf(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n');
  }
}
