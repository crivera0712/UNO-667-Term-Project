/**
 * Client-side Entry Point
 * This is the main entry point for client-side JavaScript/TypeScript code.
 * It will be bundled by webpack and served to the browser.
 */

// Socket.IO client setup
import { io } from 'socket.io-client';

// Initialize socket connection
const socket = io();

// Listen for connection events
socket.on('connect', () => {
    console.log('Connected to server');
});

// Listen for chat messages
socket.on('chat message', (msg: string) => {
    console.log('Received message:', msg);
    // TODO: Update UI with received message
});

// Export socket for use in other modules
export { socket };

// Initialize any client-side features
console.log('UNO Game Client Initialized');
