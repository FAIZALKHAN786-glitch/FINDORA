const dateFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
}

export const titleCase = (value = '') => value.charAt(0).toUpperCase() + value.slice(1);
