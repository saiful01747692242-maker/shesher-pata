/**
 * Centralized WhatsApp Configuration for Shesher Pata (শেষের পাতা)
 * 
 * IMPORTANT:
 * Replace 'YOUR_WHATSAPP_NUMBER' with your actual WhatsApp phone number.
 * Supported formats:
 *   - "YOUR_WHATSAPP_NUMBER" (Default placeholder)
 *   - "8801747692242"
 *   - "+880 1747-692242"
 *   - "01747692242"
 * 
 * The helper function automatically cleans spaces, +, hyphens, and brackets,
 * and formats it into the standard https://wa.me/<international-number> URL.
 */

export const WHATSAPP_CONFIG = {
  // Destination WhatsApp number (can be edited here or in Admin Settings)
  phoneNumber: '8801747692242',

  // Optional prefilled message when opening WhatsApp chat
  defaultMessage: 'Hello, I need help with an order from Shesher Pata.',

  // Tooltip & accessibility labels
  label: 'Contact Shesher Pata on WhatsApp',
  tooltipText: 'WhatsApp-এ যোগাযোগ করুন',
};

/**
 * Formats a phone number into a valid WhatsApp click-to-chat URL (https://wa.me/...).
 * Strips all non-digit characters (+, spaces, hyphens, parentheses).
 * Auto-prefixes Bangladesh country code (88) if 11-digit local format (01XXXXXXXXX) is provided.
 */
export function buildWhatsAppUrl(phoneNumber?: string, message?: string): string {
  const rawNumber = (phoneNumber || WHATSAPP_CONFIG.phoneNumber || '').trim();

  // If still using placeholder, use the placeholder directly
  if (rawNumber === 'YOUR_WHATSAPP_NUMBER' || !rawNumber) {
    const textParam = message ? `?text=${encodeURIComponent(message)}` : '';
    return `https://wa.me/YOUR_WHATSAPP_NUMBER${textParam}`;
  }

  // Strip all non-digit characters (+, -, space, (), etc.)
  let digits = rawNumber.replace(/\D/g, '');

  // If local Bangladeshi number (e.g., 01712345678 - 11 digits), prepend 88
  if (digits.length === 11 && digits.startsWith('01')) {
    digits = '88' + digits;
  }

  // If user provided without leading 88 or 0 (e.g. 1712345678 - 10 digits)
  if (digits.length === 10 && digits.startsWith('1')) {
    digits = '880' + digits;
  }

  const base = `https://wa.me/${digits}`;
  const text = message !== undefined ? message : WHATSAPP_CONFIG.defaultMessage;

  if (text && text.trim()) {
    return `${base}?text=${encodeURIComponent(text.trim())}`;
  }

  return base;
}
