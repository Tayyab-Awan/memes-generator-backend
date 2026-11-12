import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function docsBasicAuth(user: string, password: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? '';
    const [scheme, encoded] = header.split(' ');
    if (scheme?.toLowerCase() === 'basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      if (
        separator !== -1 &&
        safeEqual(decoded.slice(0, separator), user) &&
        safeEqual(decoded.slice(separator + 1), password)
      ) {
        next();
        return;
      }
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="API docs"');
    res.status(401).send('Unauthorized');
  };
}
