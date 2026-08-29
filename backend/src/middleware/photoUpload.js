const multer = require('multer');
const { AppError } = require('./errorHandler');

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 10, fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) return callback(new Error('Format de photo non pris en charge'));
    callback(null, true);
  },
});

function parsePhotoUpload(req, res, next) {
  photoUpload.array('photos', 10)(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return next(new AppError('Chaque photo doit faire 8 Mo maximum', 400));
    if (error.code === 'LIMIT_FILE_COUNT') return next(new AppError('Vous pouvez importer 10 photos maximum', 400));
    return next(new AppError(error.message || 'Upload de photos invalide', 400));
  });
}

module.exports = parsePhotoUpload;
