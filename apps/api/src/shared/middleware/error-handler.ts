import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { AppError } from '../errors/app-error';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada' } });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  if (err instanceof MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Imagem muito grande (máx. 2 MB)' : 'Upload inválido';
    res.status(400).json({ error: { code: 'UPLOAD_ERROR', message } });
    return;
  }
  // JSON malformado
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'JSON inválido' } });
    return;
  }

  // Erro inesperado: loga completo, devolve genérico (não vaza detalhes internos)
  req.log?.error({ err }, 'erro não tratado');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
};
