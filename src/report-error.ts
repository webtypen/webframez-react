import type { RouteContext } from "./types";

export type RouteErrorHook = (error: unknown, context: RouteContext) => boolean | void | Promise<boolean | void>;
const reported = new WeakMap<object, Set<unknown>>();

/** A host can claim errors it stores separately (e.g. customer-authored code).
 * Returning true suppresses central reporting; failing hooks never hide the original error. */
export async function reportRouteError(error: unknown, context: RouteContext, hook?: RouteErrorHook): Promise<void> {
  const request = context.request || context;
  let seen = reported.get(request);
  if (!seen) reported.set(request, seen = new Set());
  if (seen.has(error)) return;
  seen.add(error);
  try {
    if (await hook?.(error, context) === true) return;
  } catch (hookError) {
    console.error("[webframez-react] Error hook failed", hookError);
  }
  try {
    const { ErrorHandler } = await import("@webtypen/webframez-core");
    if (ErrorHandler?.report) {
      await ErrorHandler.report(error, { scope: "controller", source: "webframez-react.render", controller: { routePath: context.pathname.split(/[?#]/)[0] } });
      return;
    }
  } catch (reportError) {
    console.error("[webframez-react] Could not report render error", reportError);
  }
  console.error("[webframez-react] Render failed", error);
}
