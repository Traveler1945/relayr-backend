// Developed by Traveler 1945

import { router } from "../lib/trpc";
import { actionRouter } from "./action";
import { earningsRouter } from "./earnings";
import { operatorRouter } from "./operator";

export const appRouter = router({
  operator: operatorRouter,
  action: actionRouter,
  earnings: earningsRouter,
});

export type AppRouter = typeof appRouter;
