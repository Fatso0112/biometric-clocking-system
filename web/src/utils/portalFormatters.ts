export function getDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPortalDate(value: string): string {
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatPortalTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function formatDuration(durationMinutes: number | null): string {
  if (durationMinutes === null) return '—';
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function downloadCsv(
  filename: string,
  headers: readonly string[],
  rows: readonly (readonly (string | number | null)[])[],
): void {
  const escapeCell = (value: string | number | null) => {
    const normalized = value === null ? '' : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
  };
  const content = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
