import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/routers";

export const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async (opts) => {
      return {
        req: opts.req,
        res: {} as any,
        user: null,
      };
    },
  });
};
