// Developed by Traveler1945

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { startPaidActionEmitter } from "./lib/emitter";
import { createSseResponse } from "./lib/realtime";
import { appRouter } from "./routers";

const port = Number(process.env.PORT ?? 3001);

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === "/events") {
      return createSseResponse(req);
    }

    const response = await fetchRequestHandler({
      endpoint: "/",
      req,
      router: appRouter,
      createContext: () => ({}),
    });

    return withCors(response);
  },
});

startPaidActionEmitter();

console.log(`RELAYR API listening on http://localhost:${port}`);
console.log(`RELAYR SSE feed at http://localhost:${port}/events`);
