// Enveloppe un controller async et transmet les erreurs à errorHandler
// au lieu de devoir écrire un try/catch dans chaque fonction.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
