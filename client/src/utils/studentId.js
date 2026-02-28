export const formatStudentDisplayId = (mongoId) => {
  const raw = String(mongoId || '').trim();
  if (!raw) return 'NCXKEYS-100000';

  const hexChunk = raw.slice(-8);
  const parsed = Number.parseInt(hexChunk, 16);
  const safeNumber = Number.isFinite(parsed) ? parsed : Date.now();
  const mapped = 100000 + (Math.abs(safeNumber) % 900000000);
  return `NCXKEYS-${mapped}`;
};

