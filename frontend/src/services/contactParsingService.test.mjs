import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_FILTER_RULES,
  parseContactFromOcr,
} from './contactParsingService.ts';

const makeResult = (lines, options = {}) => ({
  text: options.text ?? lines.map((line) => line.text).join('\n'),
  blocks: options.withoutGeometry
    ? []
    : [
        {
          text: lines.map((line) => line.text).join('\n'),
          boundingBox: { x: 0, y: 0, width: 500, height: 300 },
          lines: lines.map((line, index) => ({
            text: line.text,
            boundingBox: {
              x: line.x ?? 20,
              y: line.y ?? index * 25,
              width: line.width ?? 300,
              height: line.height ?? 16,
            },
            elements: [],
          })),
        },
      ],
});

test('parses a conventional card and preserves original OCR text', () => {
  const result = makeResult([
    { text: 'John Smith', y: 10, height: 30 },
    { text: 'Senior Software Engineer', y: 48 },
    { text: 'ACME SOLUTIONS PVT LTD', y: 75, height: 24 },
    { text: 'M: +91 98765 43210', y: 110 },
    { text: 'john.smith@acme.in', y: 135 },
    { text: 'www.acme.in', y: 160 },
    { text: 'linkedin.com/in/john-smith', y: 185 },
    { text: '123 MG Road', y: 210 },
    { text: 'Bengaluru 560001', y: 235 },
    { text: 'Please recycle this card', y: 260 },
  ]);

  const parsed = parseContactFromOcr(result);

  assert.equal(parsed.name, 'John Smith');
  assert.equal(parsed.designation, 'Senior Software Engineer');
  assert.equal(parsed.company, 'ACME SOLUTIONS PVT LTD');
  assert.deepEqual(parsed.phones, ['+91 98765 43210']);
  assert.deepEqual(parsed.emails, ['john.smith@acme.in']);
  assert.equal(parsed.website, 'www.acme.in');
  assert.equal(parsed.linkedin, 'linkedin.com/in/john-smith');
  assert.equal(parsed.address, '123 MG Road, Bengaluru 560001');
  assert.equal(parsed.originalText, result.text);
  assert.deepEqual(parsed.uncertainLines, []);
  assert.deepEqual(parsed.filteredLines, [
    { text: 'Please recycle this card', reason: 'Recycling message' },
  ]);
});

test('extracts multiple values and removes normalized duplicates', () => {
  const result = makeResult([
    { text: 'Name: Ana Silva' },
    { text: 'Phone: +1 (212) 555-0198' },
    { text: '+1 212 555 0198' },
    { text: 'Office: 212-555-0133' },
    { text: 'ANA@EXAMPLE.COM' },
    { text: 'ana@example.com' },
    { text: 'sales@example.com' },
  ]);

  const parsed = parseContactFromOcr(result);

  assert.equal(parsed.name, 'Ana Silva');
  assert.deepEqual(parsed.phones, ['+1 (212) 555-0198', '212-555-0133']);
  assert.deepEqual(parsed.emails, ['ANA@EXAMPLE.COM', 'sales@example.com']);
});

test('uses labels without geometry and keeps useful extras in notes', () => {
  const result = makeResult(
    [
      { text: 'Name: Mei Tan' },
      { text: 'Designation: Director' },
      { text: 'Company: Northstar Studio' },
      { text: 'Services: Brand strategy and illustration' },
      { text: 'Email: mei@northstar.co' },
    ],
    { withoutGeometry: true }
  );

  const parsed = parseContactFromOcr(result);

  assert.equal(parsed.name, 'Mei Tan');
  assert.equal(parsed.designation, 'Director');
  assert.equal(parsed.company, 'Northstar Studio');
  assert.equal(parsed.notes, 'Services: Brand strategy and illustration');
});

test('handles two-column positions, missing fields, and long addresses', () => {
  const result = makeResult([
    { text: 'PRIYA RAO', x: 20, y: 15, height: 28 },
    { text: 'CTO', x: 20, y: 50 },
    { text: 'rao@example.org', x: 300, y: 18 },
    { text: '+44 20 7946 0958', x: 300, y: 45 },
    { text: 'Suite 18, River Plaza', x: 20, y: 100 },
    { text: '42 Market Street', x: 20, y: 125 },
    { text: 'London 10001', x: 20, y: 150 },
  ]);

  const parsed = parseContactFromOcr(result);

  assert.equal(parsed.name, 'PRIYA RAO');
  assert.equal(parsed.designation, 'CTO');
  assert.equal(parsed.company, '');
  assert.equal(
    parsed.address,
    'Suite 18, River Plaza, 42 Market Street, London 10001'
  );
});

test('does not invent ambiguous fields and exposes filtered text for recovery', () => {
  const result = makeResult([
    { text: 'Innovating Tomorrow' },
    { text: 'Reference 8472' },
    { text: 'Printed by City Press' },
    { text: 'Quality is our priority' },
  ]);

  const parsed = parseContactFromOcr(result);

  assert.equal(parsed.name, '');
  assert.equal(parsed.company, '');
  assert.deepEqual(parsed.uncertainLines, ['Innovating Tomorrow', 'Reference 8472']);
  assert.deepEqual(
    parsed.filteredLines.map((line) => line.text),
    ['Printed by City Press', 'Quality is our priority']
  );
});

test('accepts configurable filtering rules', () => {
  const customRules = [
    ...DEFAULT_FILTER_RULES,
    { id: 'custom', reason: 'Configured exclusion', pattern: /^Member since \d{4}$/i },
  ];
  const result = makeResult([{ text: 'Member since 2012' }]);

  const parsed = parseContactFromOcr(result, { filterRules: customRules });

  assert.deepEqual(parsed.filteredLines, [
    { text: 'Member since 2012', reason: 'Configured exclusion' },
  ]);
});
