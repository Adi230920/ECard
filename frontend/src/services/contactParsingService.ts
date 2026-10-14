import type { OcrResult } from './ocrService';

export interface TextFilterRule {
  id: string;
  reason: string;
  pattern: RegExp;
}

export interface RejectedText {
  text: string;
  reason: string;
}

export interface ParsedContact {
  name: string;
  designation: string;
  company: string;
  phones: string[];
  emails: string[];
  website: string;
  address: string;
  linkedin: string;
  notes: string;
  originalText: string;
  uncertainLines: string[];
  filteredLines: RejectedText[];
}

export interface ContactParserOptions {
  filterRules?: readonly TextFilterRule[];
  designationKeywords?: readonly string[];
  companyKeywords?: readonly string[];
  addressKeywords?: readonly string[];
}

interface PositionedLine {
  text: string;
  residual: string;
  index: number;
  x?: number;
  y?: number;
  height?: number;
  assigned: boolean;
}

export const DEFAULT_FILTER_RULES: readonly TextFilterRule[] = [
  {
    id: 'recycling',
    reason: 'Recycling message',
    pattern: /\b(?:please\s+)?recycle\b|\bprinted on recycled (?:paper|card)\b/i,
  },
  {
    id: 'environmental',
    reason: 'Environmental printing message',
    pattern: /\b(?:eco[- ]?friendly|save (?:paper|trees)|think before you print)\b/i,
  },
  {
    id: 'printer-credit',
    reason: 'Printing information',
    pattern: /^(?:printed|designed|produced)\s+by\b/i,
  },
  {
    id: 'promotional-slogan',
    reason: 'Promotional slogan',
    pattern:
      /\b(?:quality is our priority|your trusted partner|we make it happen|excellence in every step)\b/i,
  },
];

const DEFAULT_DESIGNATION_KEYWORDS = [
  'accountant',
  'advisor',
  'analyst',
  'architect',
  'assistant',
  'chairman',
  'consultant',
  'coordinator',
  'designer',
  'developer',
  'director',
  'engineer',
  'executive',
  'founder',
  'head',
  'manager',
  'officer',
  'owner',
  'partner',
  'president',
  'proprietor',
  'representative',
  'secretary',
  'specialist',
  'supervisor',
  'technician',
  'vice president',
  'vp',
  'ceo',
  'cfo',
  'cio',
  'cmo',
  'coo',
  'cto',
] as const;

const DEFAULT_COMPANY_KEYWORDS = [
  'associates',
  'company',
  'consulting',
  'corporation',
  'enterprises',
  'group',
  'industries',
  'limited',
  'llc',
  'llp',
  'ltd',
  'pvt',
  'services',
  'solutions',
  'studio',
  'technologies',
  'inc',
  'incorporated',
  'corp',
] as const;

const DEFAULT_ADDRESS_KEYWORDS = [
  'avenue',
  'building',
  'boulevard',
  'circle',
  'complex',
  'district',
  'floor',
  'highway',
  'lane',
  'near',
  'opposite',
  'parkway',
  'plaza',
  'road',
  'sector',
  'street',
  'suite',
  'tower',
  'village',
] as const;

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LINKEDIN_PATTERN = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[A-Z0-9_\-%/?=&.]+/gi;
const WEBSITE_PATTERN = /(?:https?:\/\/|www\.)[A-Z0-9][A-Z0-9.-]*\.[A-Z]{2,}(?:\/[A-Z0-9_\-%/?=&.#]*)?|\b(?:[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?\.)+(?:com|org|net|in|co|io|ai|biz|info|me|dev|tech)(?:\/[A-Z0-9_\-%/?=&.#]*)?/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{5,}\d(?:\s*(?:x|ext\.?|extension)\s*\d{1,6})?)/gi;
const LABEL_PREFIX_PATTERN = /^(?:(?:e-?mail|mobile|mob|phone|tel|telephone|cell|fax|direct|office|website|web|url|linkedin)\s*[:\-.]?\s*|[emptfw]\s*[:\-.]\s*)/i;

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const escapePattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const keywordPattern = (keywords: readonly string[]): RegExp =>
  new RegExp(`\\b(?:${keywords.map(escapePattern).join('|')})\\b`, 'i');

const removeMatches = (source: string, matches: readonly string[]): string => {
  let result = source;
  for (const match of matches) {
    result = result.replace(match, ' ');
  }
  return normalizeWhitespace(result.replace(LABEL_PREFIX_PATTERN, '').replace(/^[|,;:\-]+|[|,;:\-]+$/g, ''));
};

const cleanUrl = (value: string): string => value.replace(/[),.;]+$/g, '');

const normalizeEmail = (value: string): string => value.toLocaleLowerCase();

const normalizePhone = (value: string): string => {
  const extension = value.match(/(?:x|ext\.?|extension)\s*(\d{1,6})/i)?.[1];
  const digits = value.replace(/(?:x|ext\.?|extension)\s*\d{1,6}/gi, '').replace(/\D/g, '');
  return `${digits}${extension ? `x${extension}` : ''}`;
};

const uniqueBy = (values: readonly string[], key: (value: string) => string): string[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = key(value);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const collectLines = (result: OcrResult): PositionedLine[] => {
  const structuredLines = result.blocks.flatMap((block) => block.lines);
  const sourceLines =
    structuredLines.length > 0
      ? structuredLines.map((line) => ({
          text: line.text,
          x: line.boundingBox.x,
          y: line.boundingBox.y,
          height: line.boundingBox.height,
        }))
      : result.text.split(/\r?\n/).map((text) => ({ text }));

  return sourceLines
    .map((line, index) => ({
      ...line,
      text: normalizeWhitespace(line.text),
      residual: normalizeWhitespace(line.text),
      index,
      assigned: false,
    }))
    .filter((line) => line.text.length > 0);
};

const extractLabelValue = (text: string, labels: readonly string[]): string | undefined => {
  const pattern = new RegExp(`^(?:${labels.map(escapePattern).join('|')})\\s*[:\\-.]\\s*(.+)$`, 'i');
  return normalizeWhitespace(text.match(pattern)?.[1] ?? '') || undefined;
};

const hasLettersOnlyWords = (text: string): boolean => {
  const withoutTitle = text.replace(/^(?:mr|mrs|ms|miss|dr|prof)\.?\s+/i, '');
  const words = withoutTitle.split(/\s+/);
  return (
    words.length >= 2 &&
    words.length <= 5 &&
    words.every((word) => /^[\p{L}][\p{L}'’-]*$/u.test(word))
  );
};

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const isLikelyAddress = (text: string, addressPattern: RegExp): boolean => {
  const hasPostalCode = /\b(?:\d{5}(?:-\d{4})?|\d{6}|[A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/i.test(text);
  const hasStreetNumber = /^\s*\d{1,6}[A-Z]?\s+\p{L}/u.test(text);
  return addressPattern.test(text) || hasPostalCode || hasStreetNumber;
};

const getEmailDomainHint = (emails: readonly string[]): string | undefined => {
  const domain = emails[0]?.split('@')[1]?.split('.')[0];
  if (!domain || ['gmail', 'hotmail', 'outlook', 'yahoo', 'icloud'].includes(domain.toLowerCase())) {
    return undefined;
  }
  return domain.toLowerCase();
};

const lineMatchesDomain = (line: string, domain?: string): boolean => {
  if (!domain || domain.length < 3) return false;
  return line.toLowerCase().replace(/[^a-z0-9]/g, '').includes(domain.replace(/[^a-z0-9]/g, ''));
};

export const parseContactFromOcr = (
  result: OcrResult,
  options: ContactParserOptions = {}
): ParsedContact => {
  const lines = collectLines(result);
  const filterRules = options.filterRules ?? DEFAULT_FILTER_RULES;
  const designationPattern = keywordPattern(
    options.designationKeywords ?? DEFAULT_DESIGNATION_KEYWORDS
  );
  const companyPattern = keywordPattern(options.companyKeywords ?? DEFAULT_COMPANY_KEYWORDS);
  const addressPattern = keywordPattern(options.addressKeywords ?? DEFAULT_ADDRESS_KEYWORDS);

  const phones: string[] = [];
  const emails: string[] = [];
  const websites: string[] = [];
  const linkedInUrls: string[] = [];

  for (const line of lines) {
    const lineEmails = [...line.text.matchAll(EMAIL_PATTERN)].map((match) => match[0]);
    const lineLinkedIn = [...line.text.matchAll(LINKEDIN_PATTERN)].map((match) => cleanUrl(match[0]));
    const maskedEmailText = lineEmails.reduce((text, email) => text.replace(email, ' '), line.text);
    const maskedSocialText = lineLinkedIn.reduce((text, url) => text.replace(url, ' '), maskedEmailText);
    const lineWebsites = [...maskedSocialText.matchAll(WEBSITE_PATTERN)].map((match) => cleanUrl(match[0]));
    const maskedUrlText = lineWebsites.reduce((text, url) => text.replace(url, ' '), maskedSocialText);
    const linePhones = [...maskedUrlText.matchAll(PHONE_PATTERN)]
      .map((match) => normalizeWhitespace(match[0]))
      .filter((phone) => {
        const digitCount = phone.replace(/\D/g, '').length;
        return digitCount >= 7 && digitCount <= 15;
      });

    emails.push(...lineEmails);
    linkedInUrls.push(...lineLinkedIn);
    websites.push(...lineWebsites);
    phones.push(...linePhones);
    line.residual = removeMatches(line.text, [
      ...lineEmails,
      ...lineLinkedIn,
      ...lineWebsites,
      ...linePhones,
    ]);
    if (!line.residual) line.assigned = true;
  }

  const uniqueEmails = uniqueBy(emails, normalizeEmail);
  const uniquePhones = uniqueBy(phones, normalizePhone);
  const uniqueLinkedIn = uniqueBy(linkedInUrls, (value) => value.toLowerCase().replace(/\/$/, ''));
  const uniqueWebsites = uniqueBy(websites, (value) =>
    value.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
  ).filter(
    (website) =>
      !uniqueLinkedIn.some(
        (linkedIn) => cleanUrl(linkedIn).toLowerCase() === cleanUrl(website).toLowerCase()
      )
  );

  let name = '';
  let designation = '';
  let company = '';
  let address = '';
  const notes: string[] = [];
  const positionedYValues = lines.flatMap((line) =>
    typeof line.y === 'number' ? [line.y] : []
  );
  const minimumY = positionedYValues.length > 0 ? Math.min(...positionedYValues) : 0;
  const maximumY = positionedYValues.length > 0 ? Math.max(...positionedYValues) : 0;
  const isNearTop = (line: PositionedLine): boolean =>
    typeof line.y === 'number' && maximumY > minimumY
      ? line.y <= minimumY + (maximumY - minimumY) * 0.4
      : line.index <= 2;

  for (const line of lines) {
    if (line.assigned || !line.residual) continue;

    const labeledName = extractLabelValue(line.residual, ['name', 'contact']);
    const labeledDesignation = extractLabelValue(line.residual, ['title', 'designation', 'position']);
    const labeledCompany = extractLabelValue(line.residual, ['company', 'organisation', 'organization']);
    const labeledAddress = extractLabelValue(line.residual, ['address', 'office']);
    const labeledNote = extractLabelValue(line.residual, [
      'department',
      'hours',
      'products',
      'services',
      'specialisation',
      'specialization',
    ]);

    if (!name && labeledName) name = labeledName;
    else if (!designation && labeledDesignation) designation = labeledDesignation;
    else if (!company && labeledCompany) company = labeledCompany;
    else if (!address && labeledAddress) address = labeledAddress;
    else if (labeledNote) notes.push(line.residual);
    else continue;

    line.assigned = true;
  }

  const filteredLines: RejectedText[] = [];
  for (const line of lines) {
    if (line.assigned || !line.residual) continue;
    const rule = filterRules.find((candidate) => {
      candidate.pattern.lastIndex = 0;
      return candidate.pattern.test(line.residual);
    });
    if (rule) {
      filteredLines.push({ text: line.residual, reason: rule.reason });
      line.assigned = true;
    }
  }

  if (!designation) {
    const designationLine = lines.find(
      (line) => !line.assigned && designationPattern.test(line.residual)
    );
    if (designationLine) {
      designation = designationLine.residual;
      designationLine.assigned = true;
    }
  }

  const emailDomainHint = getEmailDomainHint(uniqueEmails);
  if (!company) {
    const companyCandidates = lines
      .filter((line) => !line.assigned)
      .map((line) => {
        let score = 0;
        if (companyPattern.test(line.residual)) score += 5;
        if (lineMatchesDomain(line.residual, emailDomainHint)) score += 3;
        if (line.residual === line.residual.toUpperCase() && /\p{L}/u.test(line.residual)) score += 1;
        if (isNearTop(line)) score += 1;
        return { line, score };
      })
      .filter((candidate) => candidate.score >= 4)
      .sort((a, b) => b.score - a.score || a.line.index - b.line.index);

    if (companyCandidates[0]) {
      company = companyCandidates[0].line.residual;
      companyCandidates[0].line.assigned = true;
    }
  }

  if (!address) {
    const addressLines: PositionedLine[] = [];
    for (const line of lines) {
      if (line.assigned) continue;
      if (isLikelyAddress(line.residual, addressPattern)) {
        addressLines.push(line);
        line.assigned = true;
        continue;
      }

      const previous = addressLines.at(-1);
      if (
        previous &&
        line.index === previous.index + 1 &&
        /[,\d]/.test(line.residual) &&
        !designationPattern.test(line.residual) &&
        !companyPattern.test(line.residual)
      ) {
        addressLines.push(line);
        line.assigned = true;
      }
    }
    address = addressLines.map((line) => line.residual).join(', ');
  }

  if (!name) {
    const lineHeights = lines.flatMap((line) => (line.height ? [line.height] : []));
    const medianHeight = median(lineHeights);
    const designationIndex = lines.find((line) => line.residual === designation)?.index;
    const companyIndex = lines.find((line) => line.residual === company)?.index;
    const nameCandidates = lines
      .filter((line) => !line.assigned && hasLettersOnlyWords(line.residual))
      .map((line) => {
        let score = 2;
        if (/^(?:mr|mrs|ms|miss|dr|prof)\.?\s+/i.test(line.residual)) score += 2;
        if (isNearTop(line)) score += 1;
        if (line.height && medianHeight && line.height >= medianHeight * 1.15) score += 1;
        if (designationIndex !== undefined && Math.abs(line.index - designationIndex) <= 2) score += 2;
        if (companyIndex !== undefined && Math.abs(line.index - companyIndex) <= 2) score += 1;
        if (designationPattern.test(line.residual)) score -= 4;
        if (companyPattern.test(line.residual)) score -= 4;
        if (addressPattern.test(line.residual)) score -= 4;
        return { line, score };
      })
      .filter((candidate) => candidate.score >= 4)
      .sort((a, b) => b.score - a.score || a.line.index - b.line.index);

    if (nameCandidates[0]) {
      name = nameCandidates[0].line.residual;
      nameCandidates[0].line.assigned = true;
    }
  }

  const uncertainLines = uniqueBy(
    lines.filter((line) => !line.assigned && line.residual).map((line) => line.residual),
    (value) => value.toLowerCase()
  );

  return {
    name,
    designation,
    company,
    phones: uniquePhones,
    emails: uniqueEmails,
    website: uniqueWebsites[0] ?? '',
    address,
    linkedin: uniqueLinkedIn[0] ?? '',
    notes: notes.join('\n'),
    originalText: result.text,
    uncertainLines,
    filteredLines,
  };
};
