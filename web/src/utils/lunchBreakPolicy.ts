export const LUNCH_BREAK_MAXIMUM_MINUTES = 60;
export const LUNCH_BREAK_MAXIMUM_SECONDS =
  LUNCH_BREAK_MAXIMUM_MINUTES * 60;

export function getAutomaticLunchEndMs(
  breakStartedAtUtc: string,
): number {
  return (
    new Date(breakStartedAtUtc).getTime() +
    LUNCH_BREAK_MAXIMUM_SECONDS * 1000
  );
}

export function formatLunchCountdown(
  remainingSeconds: number,
): string {
  const safeSeconds = Math.max(
    0,
    Math.floor(remainingSeconds),
  );

  const hours = Math.floor(
    safeSeconds / 3600,
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60,
  );

  const seconds =
    safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) =>
      value
        .toString()
        .padStart(2, '0'),
    )
    .join(':');
}
