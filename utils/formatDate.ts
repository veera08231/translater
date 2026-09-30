/**
 * Friendly, short dates for the history list ("Today, 3:45 PM").
 * Written by hand so it works the same on every phone.
 */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function clock(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${minutes} ${suffix}`;
}

export function formatWhen(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const daysAgo = Math.round((startOfToday - startOfDate) / 86_400_000);

  if (daysAgo === 0) return `Today, ${clock(date)}`;
  if (daysAgo === 1) return `Yesterday, ${clock(date)}`;

  const sameYear = date.getFullYear() === now.getFullYear();
  const base = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return sameYear ? `${base}, ${clock(date)}` : `${base} ${date.getFullYear()}, ${clock(date)}`;
}