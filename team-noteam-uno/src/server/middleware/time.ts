import { NextFunction, Request, Response } from "express";
const timeMiddleware = (
    request: Request,
    response: Response,
    next: NextFunction
) => {
    console.log(`Time: ${new Date()}`);
    next();
};
export { timeMiddleware };