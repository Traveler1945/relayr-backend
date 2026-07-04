// Developed by Traveler1945

/**
 * End-to-end Day 3 demo against a running relayr-backend server (MOCK_PAY=true).
 * Usage: bun run scripts/demo-day3-mock-http.ts
 */

const API = process.env.RELAYR_API_URL ?? "http://localhost:3001";

async function trpcQuery<T>(path: string, input?: unknown): Promise<T> {
  const url = new URL(`/${path}`, API);
  url.searchParams.set("input", JSON.stringify({ json: input ?? null }));

  const res = await fetch(url);
  const body = (await res.json()) as {
    result?: { data?: T };
    error?: { message?: string; json?: { message?: string } };
  };

  if (!res.ok || body.error) {
    throw new Error(
      body.error?.json?.message ?? body.error?.message ?? `tRPC query failed: ${path}`,
    );
  }

  return body.result!.data as T;
}

async function trpcMutation<T>(path: string, input: unknown): Promise<T> {
  const res = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = (await res.json()) as {
    result?: { data?: T };
    error?: { message?: string; json?: { message?: string } };
  };

  if (!res.ok || body.error) {
    throw new Error(
      body.error?.json?.message ?? body.error?.message ?? `tRPC mutation failed: ${path}`,
    );
  }

  return body.result!.data as T;
}

async function waitForSsePaidAction(timeoutMs = 8_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Timed out waiting for SSE paid_action event"));
    }, timeoutMs);

    const controller = new AbortController();

    void (async () => {
      try {
        const res = await fetch(`${API}/events`, { signal: controller.signal });
        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error("SSE stream unavailable");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const dataLine = chunk
              .split("\n")
              .find((line) => line.startsWith("data: "));
            if (!dataLine) continue;

            const payload = dataLine.slice(6);
            if (payload.includes('"type":"paid_action"')) {
              clearTimeout(timer);
              controller.abort();
              resolve(payload);
              return;
            }
          }
        }
      } catch (error) {
        if (controller.signal.aborted && timer) return;
        clearTimeout(timer);
        reject(error);
      }
    })();
  });
}

type Operator = { id: string; name: string; status: string };
type Action = { id: string; name: string; operatorId: string; priceUsdc: number };

async function main() {
  console.log("[demo-day3] API", API);
  console.log("[demo-day3] MOCK_PAY env (server must have MOCK_PAY=true):", process.env.MOCK_PAY ?? "(not set in this shell — server .env counts)");

  const operators = await trpcQuery<Operator[]>("operator.list");
  const live = operators.find((o) => o.status === "live");
  if (!live) {
    throw new Error("No live operator found — run bun run db:seed");
  }

  const actions = await trpcQuery<Action[]>("action.list", { operatorId: live.id });
  const action = actions[0];
  if (!action) {
    throw new Error(`No actions for operator ${live.name}`);
  }

  console.log("[demo-day3] operator", live.name, live.id);
  console.log("[demo-day3] action", action.name, action.id, `$${(action.priceUsdc / 100).toFixed(2)} USDC`);

  const ssePromise = waitForSsePaidAction();

  const session = await trpcMutation<{
    reference: string;
    url: string;
    mock: boolean;
    amount: number;
  }>("pay.createSession", {
    operatorId: live.id,
    actionId: action.id,
  });

  console.log("\n[demo-day3] pay.createSession");
  console.log(JSON.stringify(session, null, 2));

  const confirmed = await trpcMutation<{
    mock: boolean;
    txSignature: string;
    explorerUrl: string;
    settlement: {
      gross: number;
      operatorAmount: number;
      stakersAmount: number;
      treasuryAmount: number;
      burnAmount: number;
    };
    event: { type: string; data: Record<string, unknown> };
  }>("pay.confirm", { reference: session.reference });

  console.log("\n[demo-day3] pay.confirm");
  console.log(JSON.stringify(confirmed, null, 2));

  const ssePayload = await ssePromise;
  console.log("\n[demo-day3] SSE /events paid_action");
  console.log(ssePayload);
}

main().catch((error) => {
  console.error("[demo-day3] failed:", error);
  process.exit(1);
});
