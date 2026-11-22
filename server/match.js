export const MATCH_LIMIT = 5;
export const MIN_SCORE = 0.35;

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'left', 'found', 'lost', 'item', 'please', 'someone']);
const WEEKDAYS_LONG = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAYS_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS_LONG = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const words = (value) => String(value || '').toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 0);

export function buildItemText(item) {
  return [
    item.title,
    item.description,
    'Category: ' + item.category,
    'Location: ' + item.location,
    'Date: ' + item.lost_found_date,
  ].filter(Boolean).join('. ');
}

// Embeddings arrive from the item_embeddings jsonb column as plain arrays.
export function cosine(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function matchReasons(item, query) {
  const lowerQuery = String(query || '').toLowerCase();
  const queryWords = new Set(words(query));
  const reasons = [];

  const category = String(item.category || '');
  const categoryWords = words(category);
  const categoryHit = (category && lowerQuery.includes(category.toLowerCase()))
    || categoryWords.some((word) => word.length > 2 && queryWords.has(word));
  if (categoryHit) reasons.push(`similar category: ${category}`);

  const location = String(item.location || '');
  if (words(location).some((word) => word.length > 3 && queryWords.has(word))) {
    reasons.push(`mentions ${location}`);
  }

  if (matchesDate(lowerQuery, item.lost_found_date)) reasons.push('date matches');

  const itemWords = [...words(item.title), ...words(item.description)];
  if (itemWords.some((word) => word.length >= 4 && !STOP_WORDS.has(word) && queryWords.has(word))) {
    reasons.push('description overlap');
  }

  return [...new Set(reasons)];
}

function matchesDate(lowerQuery, value) {
  const parts = String(value || '').split('-');
  if (parts.length !== 3) return false;
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return false;

  if (lowerQuery.includes(`${year}-${parts[1]}-${parts[2]}`)) return true;

  const queryWords = new Set(words(lowerQuery));
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (queryWords.has(WEEKDAYS_LONG[weekday]) || queryWords.has(WEEKDAYS_SHORT[weekday])) return true;

  return lowerQuery.includes(`${MONTHS_LONG[month - 1]} ${day}`) || lowerQuery.includes(`${MONTHS_SHORT[month - 1]} ${day}`);
}

export function rankMatches(rows, queryVector, { query, model, limit = MATCH_LIMIT, minScore = MIN_SCORE }) {
  return rows
    .filter((row) => row.model === model)
    .map((row) => ({ row, score: cosine(row.embedding, queryVector) }))
    .filter(({ score }) => score >= minScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ row, score }) => {
      const item = { ...row };
      delete item.embedding;
      delete item.model;
      return { item, score, reasons: matchReasons(item, query) };
    });
}
