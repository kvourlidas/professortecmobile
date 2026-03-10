// src/components/profile/profileUtils.ts

export function getInitials(fullName: string | null | undefined) {
  const name = (fullName ?? '').trim();
  if (!name) return '?';

  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  const initials = (first + second).toUpperCase();
  return initials || '?';
}

export function formatGreekDate(date: string | Date | null | undefined) {
  if (!date) return '—';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());

  return `${dd}/${mm}/${yyyy}`;
}

export function safeText(value: string | null | undefined) {
  const v = (value ?? '').trim();
  return v ? v : '—';
}
