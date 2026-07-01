// Developed by Traveler 1945

import { createHTTPServer } from "@trpc/server/adapters/standalone";

import { appRouter } from "./routers";

const port = Number(process.env.PORT ?? 3001);

createHTTPServer({
  router: appRouter,
  createContext: () => ({}),
}).listen(port);

console.log(`RELAYR API listening on http://localhost:${port}`);
