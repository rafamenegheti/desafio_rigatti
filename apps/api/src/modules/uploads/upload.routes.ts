import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { Router } from 'express';
import multer from 'multer';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { authenticate, requireRole } from '../../shared/middleware/authenticate';

export const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadDir, { recursive: true });

// SVG fica de fora de propósito: pode carregar script (XSS)
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination: uploadDir,
  // Nome aleatório: ignora o nome original (evita path traversal e colisões)
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${EXT_BY_MIME[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    EXT_BY_MIME[file.mimetype] ? cb(null, true) : cb(AppError.badRequest('Envie uma imagem JPG, PNG, WEBP ou GIF')),
});

/** O Content-Type do cliente é mentira fácil; confere os bytes iniciais do arquivo. */
function looksLikeImage(file: string): boolean {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  const head = buf.toString('latin1');
  return (
    (buf[0] === 0xff && buf[1] === 0xd8) || // jpeg
    head.startsWith('\x89PNG') ||
    head.startsWith('GIF8') ||
    (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP')
  );
}

export const uploadRouter = Router();

uploadRouter.post('/', authenticate, requireRole('admin'), upload.single('image'), (req, res) => {
  if (!req.file) throw AppError.badRequest('Envie o arquivo no campo "image"');
  if (!looksLikeImage(req.file.path)) {
    fs.unlinkSync(req.file.path);
    throw AppError.badRequest('O arquivo não é uma imagem válida');
  }
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

/** Arquivos enviados são servidos como estáticos (em produção: S3/CDN). */
export const uploadStatic = express.static(uploadDir, { maxAge: '7d', index: false });
