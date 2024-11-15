import livereload from "livereload";
import connectLivereload from "connect-livereload";
import { Express } from "express";
import net from "net";

const findAvailablePort = async (startPort: number, endPort: number): Promise<number> => {
  for (let port = startPort; port <= endPort; port++) {
    try {
      const server = net.createServer();
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, () => {
          server.close();
          resolve(port);
        });
      });
      return port;
    } catch (err) {
      continue;
    }
  }
  throw new Error('No available ports found');
};

const configureLiveReload = async (app: Express) => {
  if (process.env.NODE_ENV !== "production") {
    try {
      const port = await findAvailablePort(35730, 35740);
      const liveReloadServer = livereload.createServer({
        delay: 100,
        port
      });

      liveReloadServer.watch([
        `${__dirname}/../../../views`,
        `${__dirname}/../../../public`
      ]);

      app.use(connectLivereload({
        port
      }));

      console.log(`LiveReload server started on port ${port}`);
    } catch (error) {
      console.warn('LiveReload setup failed:', error);
      // Continue without LiveReload
    }
  }
};

export default configureLiveReload;
