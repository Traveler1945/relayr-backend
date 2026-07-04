// Developed by Traveler1945

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db";
import { actions } from "../db/schema";
import { firePaidAction } from "../lib/firePaidAction";
import { publicProcedure, router } from "../lib/trpc";

export const actionRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          operatorId: z.string().uuid().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      if (input?.operatorId) {
        return db
          .select()
          .from(actions)
          .where(eq(actions.operatorId, input.operatorId))
          .orderBy(actions.name);
      }

      return db.select().from(actions).orderBy(actions.name);
    }),

  fire: publicProcedure
    .input(
      z.object({
        operatorId: z.string().uuid(),
        actionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      return firePaidAction(input);
    }),
});
