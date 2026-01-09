import { Request, Response, NextFunction } from 'express';

export function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);

  // Erros de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.message,
    });
  }

  // Erros de autorização
  if (err.message.includes('permission') || err.message.includes('not allowed')) {
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message,
    });
  }

  // Erros de não encontrado
  if (err.message.includes('not found')) {
    return res.status(404).json({
      error: 'Not found',
      message: err.message,
    });
  }

  // Erro genérico
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
