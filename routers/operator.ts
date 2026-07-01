// Developed by Traveler 1945

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db";
import { operators } from "../db/schema";
import { publicProcedure, router } from "../lib/trpc";

export const operatorRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(operators).orderBy(operators.name);
  }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [operator] = await db
        .select()
        .from(operators)
        .where(eq(operators.id, input.id))
        .limit(1);

      if (!operator) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operator not found",
        });
      }

      return operator;
    }),
});
