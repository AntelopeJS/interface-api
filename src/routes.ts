import { Logging } from "@antelopejs/interface-core/logging";
import { GetMetadata, GetResponsibleModule } from "@antelopejs/interface-core";

import { routesProxy } from "./proxies";
import { ControllerMeta } from "./controller";
import {
  type HandlerPriority,
  type RouteHandler,
  type RouteHandlerMode,
  routesList,
} from "./route-registry";

let nextId = 0;

/**
 * Register a RouteHandler to the API.
 *
 * Registers a copy that carries {@link RouteHandler.module}; the given handler
 * is not modified.
 *
 * @param handler Route handler
 * @returns New route ID
 */
export function RegisterRoute(handler: RouteHandler) {
  const id = nextId++;
  const enriched: RouteHandler = { ...handler, module: GetResponsibleModule() };
  Logging.Debug(
    `Registered ${enriched.method.toUpperCase()} ${enriched.location} (${enriched.callback.name || "anonymous"})`,
  );
  routesProxy.register(id.toString(), enriched);
  routesList.set(id.toString(), enriched);
  return id;
}

/**
 * Unregister a route registered with {@link RegisterRoute}.
 *
 * Routes are otherwise only released when their module unloads, so anything
 * with a shorter life than its module — a CMS page taken down while the module
 * stays up, a controller mounted for the duration of a job — kept answering
 * after the thing that registered it was gone. The proxy is not reachable from
 * a consumer: interface resolution rebinds it, so the handle has to come from
 * here.
 *
 * @param id Route ID returned by {@link RegisterRoute}.
 */
export function UnregisterRoute(id: number): void {
  routesProxy.unregister(id.toString());
}

/**
 * Register a RouteHandler to the API from a decorator.
 *
 * @param target Controller class
 * @param key Handler key
 * @param descriptor Handler descriptor
 * @param mode Handler mode (prefix, handler, postfix, websocket)
 * @param method HTTP method
 * @param location Endpoint location
 * @param priority Handler priority
 * @returns `{ id }`, an object because {@link Route} returns it as a method
 * decorator's property descriptor
 */
export function ProcessCallback(
  target: any,
  key: PropertyKey,
  descriptor: PropertyDescriptor,
  mode: RouteHandlerMode,
  method: string,
  location?: string,
  priority?: HandlerPriority,
) {
  const meta = GetMetadata(target.constructor, ControllerMeta);
  const fullLocation =
    `${meta.location}/${location ?? (key as string)}`.replace(/\/+/g, "/");

  return {
    id: RegisterRoute({
      mode,
      method,
      location: fullLocation,
      callback: descriptor.value,
      parameters: meta.getParameterArray(key),
      properties: meta.computed_props,
      proto: target,
      priority,
    }),
  };
}
