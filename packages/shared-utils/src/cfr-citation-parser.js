// cfr-citation-parser.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Parse and format CFR citation strings from AI responses
// Matches patterns like: 38 CFR § 3.310(a), 38 U.S.C. § 1110, 38 CFR 4.71a
const CFR_PATTERN = /\b38\s+(?:CFR|U\.S\.C\.)\s+(?:§\s*)?[\d.]+(?:\([a-z]\))*/gi;
function extractCitations(text) {
    const matches = text.match(CFR_PATTERN) ?? [];
    // Normalize whitespace and deduplicate
    const normalized = matches.map((m) => m.replace(/\s+/g, ' ').trim());
    return [...new Set(normalized)];
}
// Formats a citation as a display-safe chip label
function formatAsChip(citation) {
    return citation.replace(/\s+/g, ' ').trim();
}
export const CfrCitationParser = {
    extractCitations,
    formatAsChip,
};
//# sourceMappingURL=cfr-citation-parser.js.map