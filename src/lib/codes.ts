// Per-recipient code generator.
// Format: 2-3 chars from name initials + 4-5 random base32 chars.
// Excludes confusable chars: 0/O, 1/I/L, S/5.
// Example: Mario Rossi -> "MAR7K4P3", Luca Bianchi -> "LU93XHQ"

const ALPHA = '23456789ABCDEFGHJKMNPQRTUVWXYZ';

const randChar = (): string => ALPHA[Math.floor(Math.random() * ALPHA.length)];
const randString = (n: number): string => Array.from({ length: n }, randChar).join('');

const stripDiacritics = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '');

const initials = (firstName: string, lastName?: string): string => {
  const first = stripDiacritics(firstName).replace(/[^A-Za-z]/g, '').toUpperCase();
  const last = stripDiacritics(lastName ?? '').replace(/[^A-Za-z]/g, '').toUpperCase();
  if (first.length >= 3) return first.slice(0, 3);
  if (first && last) return (first[0] + last[0]).slice(0, 3);
  if (first) return first;
  if (last) return last.slice(0, 3);
  return 'XX';
};

export interface RecipientLike {
  firstName: string;
  lastName?: string;
}

export const generateCode = (
  recipient: RecipientLike,
  reservedSet?: Set<string>,
  randomLen = 5
): string => {
  const prefix = initials(recipient.firstName, recipient.lastName);
  for (let i = 0; i < 50; i++) {
    const code = prefix + randString(randomLen);
    if (!reservedSet || !reservedSet.has(code)) {
      reservedSet?.add(code);
      return code;
    }
  }
  // Extreme collision fallback: append timestamp slice
  const fallback = prefix + randString(randomLen) + Date.now().toString(36).slice(-3).toUpperCase();
  reservedSet?.add(fallback);
  return fallback;
};

export const generateCodesForRecipients = <T extends RecipientLike>(
  recipients: T[],
  existingCodes?: string[]
): Array<T & { code: string }> => {
  const reserved = new Set<string>(existingCodes ?? []);
  return recipients.map(r => ({ ...r, code: generateCode(r, reserved) }));
};

export const buildTrackingUrl = (baseUrl: string, code: string): string => {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `${cleanBase}/c/${code}`;
};

export const buildWhatsAppUrl = (
  merchantPhone: string,
  code: string,
  message?: string
): string => {
  const phone = merchantPhone.replace(/\D/g, '');
  const text = encodeURIComponent(message ?? `Ciao, vorrei usare il codice ${code}`);
  return `https://wa.me/${phone}?text=${text}`;
};
