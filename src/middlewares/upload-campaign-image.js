const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { HttpError } = require('../utils/http-error');

const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'campanhas');
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const extensionByMime = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, uploadsDir);
  },
  filename(req, file, callback) {
    const extension = extensionByMime[file.mimetype];
    const filename = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`;
    callback(null, filename);
  },
});

const uploadCampaignImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new HttpError(422, 'A imagem deve ser JPG, PNG, WEBP ou GIF.'));
      return;
    }

    callback(null, true);
  },
});

module.exports = {
  uploadCampaignImage,
};
