import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import flash from "express-flash";

let sessionMiddleware: RequestHandler | undefined = undefined;

export default (app: Express): RequestHandler | undefined => {
  if (sessionMiddleware === undefined) {
    sessionMiddleware = session({
      store: new (connectPgSimple(session))({
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
    });

    app.use(sessionMiddleware);
    app.use(flash());
  }
  return sessionMiddleware;
};
