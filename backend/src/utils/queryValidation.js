const { AppError } = require('../middleware/errorHandler');

function optionalNumber(value, label, { integer = false, min = -Infinity, max = Infinity } = {}) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (integer && !Number.isInteger(parsed)) || parsed < min || parsed > max) {
    throw new AppError(`${label} invalide`, 400);
  }
  return parsed;
}

function optionalStatus(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (!['to_visit', 'visited', 'favorite'].includes(value)) {
    throw new AppError('Statut invalide', 400);
  }
  return value;
}

module.exports = { optionalNumber, optionalStatus };
