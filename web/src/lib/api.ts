// API adapter. "local" runs the shared core in the browser against fictional in-memory data (no network).
// "remote" calls the secured Supabase Edge Function. Protected tables are never queried from the browser.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiResult = Record<string, any>;
export interface Api {
  mode: "local" | "remote";
  call(operation: string, body?: Record<string, unknown>): Promise<ApiResult>;
}

const env = import.meta.env;

export async function createApi(): Promise<Api> {
  const mode = (env.VITE_API_MODE as string | undefined) === "remote" ? "remote" : "local";
  if (mode === "remote") {
    const base = `${env.VITE_SUPABASE_URL}/functions/v1/mikedai_OSC_claim_ops`;
    const key = env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined; // public by design
    return {
      mode,
      async call(operation, body = {}) {
        try {
          const res = await fetch(base, {
            method: "POST",
            headers: { "content-type": "application/json", ...(key ? { apikey: key, authorization: `Bearer ${key}` } : {}) },
            body: JSON.stringify({ operation, ...body }),
          });
          return await res.json();
        } catch {
          return { ok: false, error: "SERVICE_UNAVAILABLE", message: "This service is temporarily unavailable.", humanHelpRecommended: true };
        }
      },
    };
  }
  const [{ makeDemoDeps }, { dispatch }] = await Promise.all([
    import("../../../supabase/functions/_shared/mikedai_OSC_memory_store.ts"),
    import("../../../supabase/functions/mikedai_OSC_claim_ops/handler.ts"),
  ]);
  const { deps } = await makeDemoDeps();
  const hEnv = { sharedKey: "", allowedOrigins: [], demoRevealCode: true };
  return {
    mode,
    async call(operation, body = {}) {
      return dispatch(operation, { operation, ...body }, deps, hEnv, false) as Promise<ApiResult>;
    },
  };
}
