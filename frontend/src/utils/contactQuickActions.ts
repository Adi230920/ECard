export type ContactQuickActionResult =
  | { url: string; error?: never }
  | { url?: never; error: string };

export type ContactLinkOpenResult =
  | { opened: true; error?: never }
  | { opened: false; error: unknown };

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARACTER_PATTERN = /^[+\d\s().-]+$/;
const URL_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;

const invalid = (error: string): ContactQuickActionResult => ({ error });

const cleanPhoneNumber = (value: string): ContactQuickActionResult => {
  const trimmed = value.trim();

  if (!trimmed || CONTROL_CHARACTER_PATTERN.test(trimmed)) {
    return invalid('This phone number is empty or invalid.');
  }

  if (!PHONE_CHARACTER_PATTERN.test(trimmed)) {
    return invalid('This phone number contains unsupported characters.');
  }

  const plusMatches = trimmed.match(/\+/g)?.length ?? 0;
  if (plusMatches > 1 || (plusMatches === 1 && !trimmed.startsWith('+'))) {
    return invalid('This phone number has an invalid international prefix.');
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 3 || digits.length > 15) {
    return invalid('This phone number must contain between 3 and 15 digits.');
  }

  return { url: `${trimmed.startsWith('+') ? '+' : ''}${digits}` };
};

export const createPhoneUrl = (value: string): ContactQuickActionResult => {
  const phone = cleanPhoneNumber(value);
  return phone.url ? { url: `tel:${phone.url}` } : phone;
};

export const createEmailUrl = (value: string): ContactQuickActionResult => {
  const email = value.trim();

  if (
    !email ||
    CONTROL_CHARACTER_PATTERN.test(email) ||
    email.includes('?') ||
    email.includes('#') ||
    !EMAIL_PATTERN.test(email)
  ) {
    return invalid('This email address is incomplete or invalid.');
  }

  return { url: `mailto:${email}` };
};

const createHttpUrl = (value: string): ContactQuickActionResult => {
  const trimmed = value.trim();

  if (!trimmed || CONTROL_CHARACTER_PATTERN.test(trimmed)) {
    return invalid('This web address is empty or invalid.');
  }

  if (URL_SCHEME_PATTERN.test(trimmed) && !/^https?:/i.test(trimmed)) {
    return invalid('Only HTTP and HTTPS web addresses are supported.');
  }

  try {
    const url = new URL(/^https?:/i.test(trimmed) ? trimmed : `https://${trimmed}`);

    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
      return invalid('This web address is invalid.');
    }

    if (url.username || url.password) {
      return invalid('Web addresses containing sign-in details are not supported.');
    }

    return { url: url.toString() };
  } catch {
    return invalid('This web address is invalid.');
  }
};

export const createWebsiteUrl = (value: string): ContactQuickActionResult => createHttpUrl(value);

export const createLinkedInUrl = (value: string): ContactQuickActionResult => {
  const result = createHttpUrl(value);
  if (!result.url) return result;

  const url = new URL(result.url);
  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  const pathParts = url.pathname.split('/').filter(Boolean);

  if (
    hostname !== 'linkedin.com' ||
    !['in', 'company'].includes(pathParts[0]?.toLowerCase()) ||
    !pathParts[1]
  ) {
    return invalid('This is not a valid LinkedIn profile or company URL.');
  }

  return result;
};

export const createWhatsAppUrl = (value: string): ContactQuickActionResult => {
  const trimmed = value.trim();

  if (!trimmed.startsWith('+')) {
    return invalid(
      'WhatsApp requires a full international number beginning with + and a country code.'
    );
  }

  const phone = cleanPhoneNumber(trimmed);
  if (!phone.url) return phone;

  const digits = phone.url.slice(1);
  if (!/^[1-9]\d{6,14}$/.test(digits)) {
    return invalid('WhatsApp requires a valid international number and country code.');
  }

  return { url: `https://wa.me/${digits}` };
};

export const openContactUrl = async (
  url: string,
  openUrl: (url: string) => Promise<unknown>
): Promise<ContactLinkOpenResult> => {
  try {
    await openUrl(url);
    return { opened: true };
  } catch (error) {
    return { opened: false, error };
  }
};
