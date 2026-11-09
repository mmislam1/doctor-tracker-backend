import { app } from "./app.js";
import { closeDatabase, connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

async function start(): Promise<void> {
  await connectDatabase();
  const server = app.listen(env.PORT, "0.0.0.0", () => {
    console.info(`Doctor Tracker API listening on port ${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.info(`Received ${signal}; shutting down`);
    server.close(() => {
      void closeDatabase().then(() => process.exit(0));
    });
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

start().catch(async () => {
  console.error("Server startup failed");
  await closeDatabase();
  process.exit(1);
});
