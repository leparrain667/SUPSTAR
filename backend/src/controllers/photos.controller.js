const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');

const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'));

function extensionFor(file) {
  if (file.mimetype === 'image/png') return 'png';
  if (file.mimetype === 'image/webp') return 'webp';
  if (file.mimetype === 'image/gif') return 'gif';
  return 'jpg';
}

function hasValidSignature(file) {
  const bytes = file.buffer;
  if (file.mimetype === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === 'image/gif') return bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a';
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

const uploadPhotos = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw new AppError('Sélectionnez au moins une image', 400);
  if (req.files.some((file) => !hasValidSignature(file))) throw new AppError('Le contenu d’une photo est invalide', 400);
  await fs.mkdir(uploadDirectory, { recursive: true });

  const saved = [];
  try {
    for (const file of req.files) {
      const filename = `${crypto.randomUUID()}.${extensionFor(file)}`;
      await fs.writeFile(path.join(uploadDirectory, filename), file.buffer, { flag: 'wx' });
      saved.push({ filename, url: `/uploads/${filename}` });
    }
    const photos = await prisma.$transaction(saved.map(({ url }) => prisma.placePhoto.create({
      data: { placeId: req.params.id, url, uploadedBy: req.user.id },
    })));
    res.status(201).json({ photos });
  } catch (error) {
    await Promise.all(saved.map(({ filename }) => fs.unlink(path.join(uploadDirectory, filename)).catch(() => {})));
    throw error;
  }
});

const deletePhoto = asyncHandler(async (req, res) => {
  const photo = await prisma.placePhoto.findFirst({ where: { id: req.params.photoId, placeId: req.params.id } });
  if (!photo) throw new AppError('Photo non trouvée', 404);
  await prisma.placePhoto.delete({ where: { id: photo.id } });
  if (photo.url.startsWith('/uploads/')) await fs.unlink(path.join(uploadDirectory, path.basename(photo.url))).catch(() => {});
  res.status(204).send();
});

module.exports = { uploadPhotos, deletePhoto };
