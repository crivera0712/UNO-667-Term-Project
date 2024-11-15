declare module 'express-session' {
    interface SessionData {
        userId: number;
        user: {
            id: number;
            username: string;
            email: string;
        };
    }
}
