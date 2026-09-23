/** Normalizes Indian mobile numbers to Supabase's expected E.164 form (+91XXXXXXXXXX). */
export function normalizeIndianPhone(input: string): string {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  if (digits.length === 13 && digits.startsWith("091")) {
    return `+91${digits.slice(3)}`;
  }
  return `+${digits}`;
}
