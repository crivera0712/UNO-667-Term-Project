# UNO Online Game

A multiplayer UNO card game implementation using TypeScript, Express, and WebSocket.

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
```

3. Start the development server:
```bash
npm run start:dev
```

This will:
- Start the Express server
- Run Webpack in watch mode
- Enable LiveReload for automatic browser refresh

## Available Scripts

- `npm run build`: Build the client-side TypeScript code
- `npm run build:dev`: Build and watch for changes in development mode
- `npm run server:dev`: Start the development server with hot reload
- `npm run start:dev`: Run both the server and webpack build concurrently

## Project Structure

- `/src/client`: Client-side TypeScript code
- `/src/server`: Express server and API routes
- `/src/public`: Static assets (CSS, compiled JS)
- `/src/views`: EJS templates
- `/src/views/partials`: Reusable template components
- `/src/views/auth`: Authentication-related pages
- `/src/views/game`: Game-related pages

## Available Routes

- `/`: Landing page (unauthenticated)
- `/home`: Dashboard with game list (authenticated)
- `/login`: Login page
- `/register`: Registration page
- `/lobby/:id`: Game lobby
- `/game/:id`: Active game page

## Development

The project uses TypeScript for both frontend and backend code. The development server includes:

- Hot reloading for server-side code
- LiveReload for client-side changes
- TypeScript compilation
- EJS templating
- Static file serving

## Testing

Run the development server and visit http://localhost:3000 to test the application.
