const { Blob } = require('buffer');

const LUXAND_API_BASE = 'https://api.luxand.cloud';

const getLuxandToken = () => String(process.env.LUXAND_API_TOKEN || '').trim();

const isLuxandConfigured = () => Boolean(getLuxandToken());

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseJsonSafe = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const dataUrlToBlob = (value) => {
  const input = String(value || '');
  const match = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const [, mimeType, base64Payload] = match;
  const imageBuffer = Buffer.from(base64Payload, 'base64');
  return new Blob([imageBuffer], { type: mimeType });
};

const requestLuxand = async (path, formData) => {
  const token = getLuxandToken();
  if (!token) {
    throw new Error('Luxand token is missing');
  }
  if (typeof fetch !== 'function' || typeof FormData === 'undefined') {
    throw new Error('Node runtime must support fetch/FormData for Luxand integration');
  }

  const response = await fetch(`${LUXAND_API_BASE}${path}`, {
    method: 'POST',
    headers: { token },
    body: formData
  });

  const raw = await response.text();
  const parsed = parseJsonSafe(raw);

  if (!response.ok) {
    const message =
      (parsed && (parsed.error || parsed.message || parsed.detail)) ||
      raw ||
      `Luxand request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = parsed || raw;
    throw error;
  }

  return parsed ?? raw;
};

const pickPersonId = (payload) => {
  if (!payload || typeof payload !== 'object') return '';

  const candidates = [
    payload.uuid,
    payload.person_uuid,
    payload.personId,
    payload.person_id,
    payload.id
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || '').trim();
    if (normalized) return normalized;
  }

  return '';
};

const normalizeMatchCandidate = (entry) => {
  if (!entry || typeof entry !== 'object') return null;

  const personId = String(
    entry.uuid ??
      entry.person_uuid ??
      entry.personId ??
      entry.person_id ??
      entry.id ??
      ''
  ).trim();

  const scoreRaw =
    entry.probability ??
    entry.similarity ??
    entry.score ??
    entry.confidence ??
    entry.match ??
    null;

  return {
    personId,
    score: toFiniteNumber(scoreRaw),
    raw: entry
  };
};

const extractMatchCandidates = (payload) => {
  const queue = [payload];
  const candidates = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (Array.isArray(current)) {
      current.forEach((item) => queue.push(item));
      continue;
    }

    if (typeof current !== 'object') continue;

    const candidate = normalizeMatchCandidate(current);
    if (candidate && candidate.personId) {
      candidates.push(candidate);
    }

    Object.values(current).forEach((value) => {
      if (value && (Array.isArray(value) || typeof value === 'object')) {
        queue.push(value);
      }
    });
  }

  return candidates;
};

const extractLiveness = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { isLive: false, score: null, reason: 'invalid-payload', payload };
  }

  const directBoolean = payload.is_live ?? payload.live ?? payload.liveness_passed ?? null;
  const directScoreRaw =
    payload.liveness ??
    payload.score ??
    payload.probability ??
    payload.confidence ??
    payload.live_score ??
    null;

  const nested = payload.result && typeof payload.result === 'object' ? payload.result : null;
  const nestedBoolean = nested
    ? (nested.is_live ?? nested.live ?? nested.liveness_passed ?? null)
    : null;
  const nestedScoreRaw = nested
    ? (nested.liveness ?? nested.score ?? nested.probability ?? nested.confidence ?? null)
    : null;

  const explicitBoolean = [directBoolean, nestedBoolean].find((value) => typeof value === 'boolean');
  const score = toFiniteNumber(directScoreRaw ?? nestedScoreRaw);

  if (typeof explicitBoolean === 'boolean') {
    return {
      isLive: explicitBoolean,
      score: score == null ? null : (score > 1 ? score / 100 : score),
      reason: 'boolean-flag',
      payload
    };
  }

  if (score != null) {
    const normalized = score > 1 ? score / 100 : score;
    return {
      isLive: normalized >= 0.5,
      score: normalized,
      reason: 'score-derived',
      payload
    };
  }

  return { isLive: false, score: null, reason: 'no-liveness-field', payload };
};

const createPersonFromFace = async ({ name, faceCapture, collection = 'students' }) => {
  const imageBlob = dataUrlToBlob(faceCapture);
  if (!imageBlob) {
    throw new Error('Invalid signup face capture format');
  }

  const payload = new FormData();
  payload.append('name', String(name || 'Student').slice(0, 120));
  payload.append('store', '1');
  if (collection) {
    payload.append('collections', String(collection).slice(0, 120));
  }
  payload.append('photo', imageBlob, 'signup-face.jpg');

  const response = await requestLuxand('/v2/person', payload);
  const personId = pickPersonId(response);

  if (!personId) {
    const error = new Error('Luxand did not return a person id');
    error.payload = response;
    throw error;
  }

  return {
    personId,
    payload: response
  };
};

const searchFaceMatches = async ({ faceCapture, limit = 5 }) => {
  const imageBlob = dataUrlToBlob(faceCapture);
  if (!imageBlob) {
    throw new Error('Invalid verification face capture format');
  }

  const payload = new FormData();
  payload.append('photo', imageBlob, 'verification-face.jpg');
  payload.append('limit', String(limit));

  const response = await requestLuxand('/photo/search/v2', payload);
  const matches = extractMatchCandidates(response);

  return {
    matches,
    payload: response
  };
};

const detectLiveness = async ({ faceCapture }) => {
  const imageBlob = dataUrlToBlob(faceCapture);
  if (!imageBlob) {
    throw new Error('Invalid liveness face capture format');
  }

  const payload = new FormData();
  payload.append('photo', imageBlob, 'liveness-face.jpg');

  const response = await requestLuxand('/detect/liveness', payload);
  return extractLiveness(response);
};

const evaluateFaceMatch = ({ expectedPersonId, matches, minScore = 0.78 }) => {
  const expected = String(expectedPersonId || '').trim().toLowerCase();
  if (!expected) {
    return { matched: false, score: null, reason: 'missing-expected-person-id' };
  }

  const candidate = (matches || []).find(
    (entry) => String(entry.personId || '').trim().toLowerCase() === expected
  );

  if (!candidate) {
    return { matched: false, score: null, reason: 'person-not-found' };
  }

  if (candidate.score == null) {
    return { matched: true, score: null, reason: 'person-found-no-score' };
  }

  const threshold = minScore <= 1 ? minScore : minScore / 100;
  const normalizedScore = candidate.score > 1 ? candidate.score / 100 : candidate.score;
  const matched = normalizedScore >= threshold;

  return {
    matched,
    score: normalizedScore,
    reason: matched ? 'score-passed' : 'score-below-threshold'
  };
};

module.exports = {
  createPersonFromFace,
  searchFaceMatches,
  detectLiveness,
  evaluateFaceMatch,
  isLuxandConfigured
};
