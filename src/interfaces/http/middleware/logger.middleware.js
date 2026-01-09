import { Request, Response, NextFunction } from "express";

/**

 * Middleware para logar todas as requests

 */

export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);

  console.log("Headers:", {
    "content-type": req.headers["content-type"],

    authorization: req.headers.authorization ? "Bearer ***" : undefined,

    "x-api-key": req.headers["x-api-key"] ? "sk_***" : undefined,
  });

  res.on("finish", () => {
    const duration = Date.now() - start;

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${
        res.statusCode
      } (${duration}ms)`
    );
  });

  next();
}
