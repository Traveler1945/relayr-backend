// Developed by Traveler1945

import { router } from "../lib/trpc";
import { actionRouter } from "./action";
import { earningsRouter } from "./earnings";
import { operatorRouter } from "./operator";
import { payRouter } from "./pay";

export const appRouter = router({
  operator: operatorRouter,
  action: actionRouter,
  earnings: earningsRouter,
  pay: payRouter,
});

export type AppRouter = typeof appRouter;
