import { InterfaceFunction } from "@antelopejs/interface-core";

import type { HTTPResult, RequestContext } from "./index";

/** A trusted registered GET target, resolved anew by the server after reloads. */
export interface RegisteredReadTarget {
  routeId: string;
  /** Absolute pathname only; no origin, query parameters or fragment. */
  pathname: string;
  /** Server-selected query values; the parent request's query is never inherited. */
  query?: Readonly<Record<string, string>>;
}

/**
 * Execute a registered GET in an isolated child request, retaining the caller's
 * credentials and peer address metadata on a detached socket. Transport writes
 * and timeout changes interrupt the read without touching the live connection.
 * The child does not expose a live TLS socket or transport-specific methods.
 * Runs applicable prefixes, computed
 * properties, parameter decorators, handler and postfixes. Refuses redirects,
 * streams, early middleware responses and paths resolving to another handler.
 * The target must be server-selected, never taken from an HTTP request body.
 * A successful result means that the selected handler completed successfully;
 * it does not authorize unrelated objects or bypass the handler's own policy.
 * Returns the final HTTP response; callers must validate its content and shape.
 * Requires an API provider implementing the registered-read subinterface.
 */
export const ExecuteRegisteredRead =
  InterfaceFunction<
    (
      target: RegisteredReadTarget,
      context: RequestContext,
    ) => Promise<HTTPResult>
  >();
