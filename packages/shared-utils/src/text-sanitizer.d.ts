declare function redactSsn(text: string): string;
declare function redactVaFileNumbers(text: string): string;
declare function redactDob(text: string): string;
declare function redactCreditCardDigits(text: string, digits: string): string;
declare function sanitizeAll(text: string): string;
export declare const TextSanitizer: {
    readonly redactSsn: typeof redactSsn;
    readonly redactVaFileNumbers: typeof redactVaFileNumbers;
    readonly redactDob: typeof redactDob;
    readonly redactCreditCardDigits: typeof redactCreditCardDigits;
    readonly sanitizeAll: typeof sanitizeAll;
};
export {};
//# sourceMappingURL=text-sanitizer.d.ts.map