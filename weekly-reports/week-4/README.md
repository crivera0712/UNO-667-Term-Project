# Milestone 4 - Authentication System Implementation

## TEAM: NOTEAM

### Team Information
**Team Name:** NOTEAM

**Team Members**
- Christian Rivera (ID: 917067715)
- Gabriel Fernandez (ID: 920489931)
- Aldo Zaboni (ID: 922982460)
- Daniel Duenas (ID: 922924285)

**Link to GitHub repository:** https://github.com/crivera0712/UNO-667-Term-Project
**Link to GitHub Project Board:** https://github.com/users/crivera0712/projects/2/views/1

## Overview

We implemented a complete authentication system for our UNO game application using Node.js, Express, and TypeScript. The system includes user registration, login functionality, and session management.

## Key Components Implemented

### 1. Route Structure

Created a centralized route manifest (/routes/index.ts) for better organization:

```typescript
export { default as auth } from "./auth";
export { default as games } from "./games";
export { default as home } from "./home";
export { default as mainLobby } from "./main_lobby";
export { default as test } from "./test";
```

### 2. Authentication Middleware

Implemented middleware to protect routes requiring authentication:

```typescript
interface AuthRequest extends Request {
  session: session.Session & {
    user?: {
      id: number;
      username: string;
      email: string;
      gravatar: string;
    };
  };
}

const authenticationMiddleware = (request: AuthRequest, response: Response, next: NextFunction) => {
  if (!request.session.user) {
    response.redirect("/auth/login");
  } else {
    response.locals.user = request.session.user;
    next();
  }
};
```

### 3. Database Integration

Set up PostgreSQL database connection using pg-promise:

```typescript
import pgPromise from "pg-promise";

const pgp = pgPromise();
const connection = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "uno_dev",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD
};

export default pgp(connection);
```

### 4. User Management

Implemented user database operations with TypeScript interfaces:

```typescript
interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  gravatar: string;
  created_at: Date;
}

// User operations including registration and lookup
const register = async (username: string, email: string, clearTextPassword: string): Promise<User> => {
  const password = await bcrypt.hash(clearTextPassword, 10);
  const gravatar = createHash("sha256").update(email).digest("hex");
  return await db.one<User>(
    "INSERT INTO users (username, email, password, gravatar) VALUES ($1, $2, $3, $4) RETURNING *",
    [username, email, password, gravatar]
  );
};
```

### 5. Dependencies Added

Added essential authentication-related packages:
- bcrypt: For password hashing
- connect-pg-simple: For PostgreSQL session storage
- express-session: For session management
- express-flash: For flash messages
- pg-promise: For PostgreSQL database operations

## Security Features

- **Password Hashing:** Implemented using bcrypt with salt rounds of 10
- **Session Management:** Secure session handling with PostgreSQL storage
- **Gravatar Integration:** Automatic avatar generation using email hash
- **Protected Routes:** Authentication middleware for secure access control

## Development Tools

- LiveReload for development efficiency
- Webpack configuration for frontend asset management
- Nodemon for automatic server restart
- Concurrent processing for frontend and backend development