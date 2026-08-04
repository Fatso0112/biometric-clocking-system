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
  rows: readonly (
    readonly (string | number | null)[]
  )[],
): void {
  // Semicolon works reliably with Excel regional
  // settings that do not recognise commas as separators.
  const delimiter = ';';

  const escapeCell = (
    value: string | number | null,
  ): string => {
    const normalized =
      value === null ? '' : String(value);

    return `"${normalized.replace(/"/g, '""')}"`;
  };

  const csvRows = [
    headers,
    ...rows,
  ].map((row) =>
    row
      .map(escapeCell)
      .join(delimiter),
  );

  /*
   * sep=; tells Excel which separator to use.
   * The UTF-8 BOM ensures names and special
   * characters display correctly.
   */
  const content = [
    `sep=${delimiter}`,
    ...csvRows,
  ].join('\r\n');

  const blob = new Blob(
    ['\uFEFF', content],
    {
      type: 'text/csv;charset=utf-8;',
    },
  );

  const url = URL.createObjectURL(blob);

  const anchor =
    document.createElement('a');

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
