/** Saudi national ID (starts with 1) or Iqama (starts with 2): exactly 10 digits. */
export const NATIONAL_ID_RE = /^[12]\d{9}$/;

/** Converts Arabic-Indic / Persian digits to Latin and keeps digits only. */
export function digitsOnly(value: string) {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, "");
}

export const isNationalId = (value: string) => NATIONAL_ID_RE.test(digitsOnly(value));

/** Shows only the last four digits, e.g. ••••••6789. */
export const maskNationalId = (value?: string | null) => (value ? `••••••${value.slice(-4)}` : "—");
