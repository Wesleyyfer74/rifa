const crypto = require('crypto');
const { env } = require('../config/env');

function getKey() {
  return crypto
    .createHash('sha256')
    .update(env.appKey || env.jwtSecret || 'dev-local-secret')
    .digest();
}

function encryptSecret(value) {
  if (!value) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

function decryptSecret(value) {
  if (!value) return null;

  const raw = String(value);
  if (!raw.startsWith('v1:')) {
    return raw;
  }

  const [, ivValue, tagValue, encryptedValue] = raw.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getKey(),
    Buffer.from(ivValue, 'base64url'),
  );

  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = {
  decryptSecret,
  encryptSecret,
};
