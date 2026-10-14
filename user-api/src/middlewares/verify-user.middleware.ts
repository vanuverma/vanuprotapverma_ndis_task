import type { Request, Response, NextFunction } from "express";

export function requireVerifiedUser(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const user = req.headers['x-verified-user'];

    if (!user || typeof user !== 'string' || user.trim() === '') {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    req.user = user;
    next();
}
