// Developed by Traveler1945

import type { PaidActionBroadcast } from "./paidActionEvent";

type Subscriber = (payload: string) => void;

const subscribers = new Set<Subscriber>();

export function subscribe(handler: Subscriber): () => void {
  subscribers.add(handler);
  return () => subscribers.delete(handler);
}

export function broadcastPaidAction(event: PaidActionBroadcast): void {
  const payload = JSON.stringify(event);
  for (const handler of subscribers) {
    handler(payload);
  }
}

export function createSseResponse(req: Request): Response {
  let unsubscribe = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      send(JSON.stringify({ type: "connected", ts: Math.floor(Date.now() / 1000) }));
      unsubscribe = subscribe(send);

      req.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
    cancel() {
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
