const multer = require('multer');
const { HttpError } = require('../utils/http-error');

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const uploadCampaignImage = multer({
  storage: multer.memoryStorage(),
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

function fileToDataUrl(file) {
  if (!file?.buffer || !allowedMimeTypes.has(file.mimetype)) {
    return null;
  }

  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

module.exports = {
  fileToDataUrl,
  uploadCampaignImage,
};
