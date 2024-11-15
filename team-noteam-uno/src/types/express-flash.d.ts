import { Request } from 'express';

declare module 'express-flash' {
    function flash(): (req: Request, res: Response, next: Function) => any;
    export = flash;
}

declare global {
    namespace Express {
        interface Request {
            flash(event: string, message?: any): any;
        }
    }
}
