export function buildUpiUri(opts: {
  payeeVpa: string;
  payeeName: string;
  amountPaise: number;
  note: string;
}): string {
  const params = new URLSearchParams({
    pa: opts.payeeVpa,
    pn: opts.payeeName,
    am: (opts.amountPaise / 100).toFixed(2),
    tn: opts.note,
  });
  return `upi://pay?${params.toString()}`;
}
