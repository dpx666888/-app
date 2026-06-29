import CryptoJS from 'crypto-js';

function generateSalt(len = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let salt = '';
  for (let i = 0; i < len; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

export function hashPassword(password, salt) {
  const s = salt || generateSalt();
  const hash = CryptoJS.SHA256(password + s).toString(CryptoJS.enc.Hex);
  return { hash, salt: s };
}

export function verifyPassword(password, hash, salt) {
  return hashPassword(password, salt).hash === hash;
}
