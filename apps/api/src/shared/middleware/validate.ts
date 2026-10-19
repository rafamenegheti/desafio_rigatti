import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Valida (e normaliza) uma parte da requisição com Zod.
 * O resultado fica em res.locals.<source>, porque em Express 5 req.query é somente leitura.
 */
export function validate(source: Source, schema: ZodType): RequestHandler {
  return (req, res, next) => {
    res.locals[source] = schema.parse(req[source]);
    next();
  };
}
