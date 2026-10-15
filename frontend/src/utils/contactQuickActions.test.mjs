import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmailUrl,
  createLinkedInUrl,
  createPhoneUrl,
  createWebsiteUrl,
  createWhatsAppUrl,
  openContactUrl,
} from './contactQuickActions.ts';

test('creates safe dialer links without changing stored numbers', () => {
  assert.deepEqual(createPhoneUrl(' +91 (98765) 43210 '), { url: 'tel:+919876543210' });
  assert.deepEqual(createPhoneUrl('080 5555 0101'), { url: 'tel:08055550101' });
  assert.match(createPhoneUrl('555-CALL').error ?? '', /unsupported characters/);
  assert.match(createPhoneUrl('12').error ?? '', /between 3 and 15 digits/);
});

test('creates safe email links and rejects unsafe recipients', () => {
  assert.deepEqual(createEmailUrl(' ana+sales@example.com '), {
    url: 'mailto:ana+sales@example.com',
  });
  assert.match(createEmailUrl('missing-domain@').error ?? '', /invalid/);
  assert.match(createEmailUrl('ana@example.com?subject=Injected').error ?? '', /invalid/);
  assert.match(createEmailUrl('ana@example.com\nBcc:other@example.com').error ?? '', /invalid/);
});

test('normalizes valid websites to HTTP links and blocks unsafe schemes', () => {
  assert.deepEqual(createWebsiteUrl('example.com/contact'), {
    url: 'https://example.com/contact',
  });
  assert.deepEqual(createWebsiteUrl('http://example.com'), { url: 'http://example.com/' });
  assert.match(createWebsiteUrl('javascript:alert(1)').error ?? '', /HTTP and HTTPS/);
  assert.match(createWebsiteUrl('https://user:pass@example.com').error ?? '', /sign-in details/);
});

test('accepts LinkedIn profiles and companies but rejects unrelated URLs', () => {
  assert.deepEqual(createLinkedInUrl('linkedin.com/in/ana-silva'), {
    url: 'https://linkedin.com/in/ana-silva',
  });
  assert.deepEqual(createLinkedInUrl('https://www.linkedin.com/company/acme/'), {
    url: 'https://www.linkedin.com/company/acme/',
  });
  assert.match(createLinkedInUrl('https://example.com/in/ana').error ?? '', /LinkedIn/);
  assert.match(createLinkedInUrl('linkedin.com/feed').error ?? '', /LinkedIn/);
});

test('creates WhatsApp links only from explicit international numbers', () => {
  assert.deepEqual(createWhatsAppUrl('+91 98765 43210'), {
    url: 'https://wa.me/919876543210',
  });
  assert.match(createWhatsAppUrl('080 5555 0101').error ?? '', /beginning with \+/);
  assert.match(createWhatsAppUrl('+0123456789').error ?? '', /valid international/);
  assert.match(createWhatsAppUrl('+1 23').error ?? '', /valid international/);
});

test('reports unavailable applications and failed link launches', async () => {
  const available = await openContactUrl('tel:+12125550198', async () => undefined);
  const unavailable = await openContactUrl('mailto:ana@example.com', async () => {
    throw new Error('No application can handle this URL');
  });

  assert.deepEqual(available, { opened: true });
  assert.equal(unavailable.opened, false);
  assert.match(String(unavailable.error), /No application/);
});
