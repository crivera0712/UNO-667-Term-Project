import livereload from "livereload";
import connectLivereload from "connect-livereload";
import { Express } from "express";
import net from "net";

/**
 * Finds an available port within a specified range.
 * This is useful to avoid port conflicts when starting the LiveReload server.
 *
 * @param startPort - The beginning of the port range to search
 * @param endPort - The end of the port range to search
 * @returns Promise<number> - Returns the first available port found
 * @throws Error if no available ports are found in the range
 */
const findAvailablePort = async (startPort: number, endPort: number): Promise<number> => {
  for (let port = startPort; port <= endPort; port++) {
    try {
      // Create a temporary server to test if port is available
      const server = net.createServer();
      await new Promise((resolve, reject) => {
        server.once('error', reject); // Port is in use or other error
        server.listen(port, () => {
          server.close(); // Close the temporary server
          resolve(port); // Port is available
        });
      });
      return port;
    } catch (err) {
      continue; // Try next port if current one is unavailable
    }
  }
  throw new Error('No available ports found');
};

/**
 * Configures LiveReload for development environment.
 * LiveReload automatically refreshes the browser when files are changed.
 *
 * @param app - Express application instance
 * @returns Promise<void>
 *
 * Features:
 * - Only runs in development environment
 * - Finds an available port in range 35730-35740
 * - Watches for changes in views and public directories
 * - Adds LiveReload middleware to Express app
 */
const configureLiveReload = async (app: Express) => {
  if (process.env.NODE_ENV !== "production") {
    try {
      // Find an available port for LiveReload server
      const port = await findAvailablePort(35730, 35740);

      // Create LiveReload server with minimal delay
      const liveReloadServer = livereload.createServer({
        delay: 100, // Delay before reload (milliseconds)
        port
      });

      // Watch directories for changes
      liveReloadServer.watch([
        `${__dirname}/../../../views`,   // Watch view templates
        `${__dirname}/../../../public`   // Watch public assets
      ]);

      // Add LiveReload middleware to inject the LiveReload script
      app.use(connectLivereload({
        port
      }));

      console.log(`LiveReload server started on port ${port}`);
    } catch (error) {
      console.warn('LiveReload setup failed:', error);
      // Continue application execution without LiveReload
    }
  }
};

export default configureLiveReload;
