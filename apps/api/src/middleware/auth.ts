import { Request, Response, NextFunction } from 'express';

export const requireSession = (req: Request, res: Response, next: NextFunction) => {
  if (!(req.session as any)?.userId) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }
  next();
};