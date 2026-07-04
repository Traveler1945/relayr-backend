// Developed by Traveler1945

import { z } from "zod";

import { confirmPay } from "../lib/pay/confirmPay";
import { createPaySession } from "../lib/pay/createSession";
import { publicProcedure, router } from "../lib/trpc";

export const payRouter = router({
  createSession: publicProcedure
    .input(
      z.object({
        operatorId: z.string().uuid(),
        actionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => createPaySession(input)),

  confirm: publicProcedure
    .input(
      z.object({
        reference: z.string().min(32),
      }),
    )
    .mutation(async ({ input }) => confirmPay(input)),
});
