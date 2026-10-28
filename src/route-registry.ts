import { RegisteringProxy } from "@antelopejs/interface-core";

import type { ComputedParameter } from "./controller";

/**
 * Handler priority enum.
 * Controls the execution order for handlers when multiple handlers match a route.
 * Lower values indicate higher priority and will execute first.
 */
export enum HandlerPriority {
  /** Executes first. */
  HIGHEST = 0,
  HIGH = 1,
  /** Default priority. */
  NORMAL = 2,
  LOW = 3,
  /** Executes last. */
  LOWEST = 4,
}

/**
 * Handler mode.
 */
export type RouteHandlerMode =
  | "prefix"
  | "postfix"
  | "handler"
  | "monitor"
  | "websocket";

/**
 * Route handler information.
 */
export interface RouteHandler {
  /**
   * Mode (prefix, handler, postfix, monitor, websocket).
   */
  mode: RouteHandlerMode;

  /**
   * HTTP method.
   */
  method: string;

  /**
   * Full location of the handler.
   */
  location: string;

  /**
   * Handler callback.
   *
   * @param args Handler parameters.
   * @returns Handler result.
   */
  callback: (...args: any[]) => any;

  /**
   * Computer handler parameters.
   */
  parameters: Array<ComputedParameter | null>;

  /**
   * Computed controller properties (reference).
   */
  properties: Record<string, ComputedParameter>;

  /**
   * Controller prototype.
   */
  proto: any;

  /**
   * Handler priority.
   */
  priority?: HandlerPriority;

  /**
   * Id of the module that registered this route, resolved from the call stack
   * at registration time. Set by {@link RegisterRoute}; may be undefined when
   * the responsible module cannot be determined.
   */
  module?: string;
}

/**
 * Complete registered route handler and its identifier.
 */
export interface RegisteredRouteHandler {
  id: string;
  handler: RouteHandler;
}

/**
 * Registered route handlers indexed by their proxy id, mirroring the entries
 * held by {@link routesProxy}. Pruned by {@link RoutesProxy} so stale handlers
 * do not accumulate across module reloads.
 */
export const routesList = new Map<string, RouteHandler>();

/**
 * Retrieves complete registered route handlers.
 *
 * @returns A new array for this interface instance, with string IDs and shared
 * handler references. Treat the handlers as read-only; this is not a deep copy.
 */
export function getRegisteredRouteHandlers(): RegisteredRouteHandler[] {
  return Array.from(routesList, ([id, handler]) => ({ id, handler }));
}

/**
 * RegisteringProxy that also prunes {@link routesList} on the same lifecycle
 * events that remove the real routes (single unregister or module unload), so
 * reloading a controller module releases its previous route entries instead of
 * leaking them.
 */
export class RoutesProxy extends RegisteringProxy<
  (id: string, handler: RouteHandler) => void
> {
  override unregister(id: string) {
    routesList.delete(id);
    super.unregister(id);
  }

  override unregisterModule(mod: string) {
    for (const [id, handler] of routesList) {
      if (handler.module === mod) {
        routesList.delete(id);
      }
    }
    super.unregisterModule(mod);
  }
}

/**
 * Retrieves all registered routes with detailed information.
 *
 * @returns A new summary array for this interface instance. IDs are strings;
 * parameters and properties reference the registered metadata, not copies.
 */
export function getRegisteredRoutes(): Array<{
  id: string;
  location: string;
  method: string;
  callbackName: string;
  parameters: Array<ComputedParameter | null>;
  properties: Record<string, ComputedParameter>;
  priority?: HandlerPriority;
  module?: string;
}> {
  return Array.from(routesList, ([id, handler]) => ({
    id,
    location: handler.location,
    method: handler.method,
    callbackName: handler.callback.name || "anonymous",
    parameters: handler.parameters,
    properties: handler.properties,
    priority: handler.priority,
    module: handler.module,
  }));
}
