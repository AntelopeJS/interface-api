import { Logging } from "@antelopejs/interface-core/logging";
import { GetMetadata, GetResponsibleModule } from "@antelopejs/interface-core";

import { isControllerClass, isObject, isSymbol } from "./guards";
import { routesProxy } from "./proxies";
import { ControllerMeta, type ControllerClass } from "./controller";
import {
  type HandlerPriority,
  type LegacyRouteHandler,
  type RouteHandler,
  type RouteHandlerMode,
  routesList,
} from "./route-registry";

let nextId = 0;

function controllerOf(
  handler: RouteHandler | LegacyRouteHandler,
): ControllerClass {
  if (handler.controller !== undefined) {
    return handler.controller;
  }
  const declared: unknown = handler.proto.constructor;
  if (!isControllerClass(declared)) {
    throw new TypeError(
      `Cannot register ${handler.method.toUpperCase()} ${handler.location}: it names no controller, and its proto is not the prototype of a controller class`,
    );
  }
  return declared;
}

/**
 * Register a RouteHandler to the API.
 *
 * Registers a copy that carries {@link RouteHandler.module} and, unless the
 * handler gives its own, the deprecated {@link RouteHandler.proto}; the given
 * handler is not modified. A handler that names only its `proto`, as an
 * implementation built against interface-api 0.2 or earlier registers it, gets
 * its {@link RouteHandler.controller} from `proto.constructor`; it is refused
 * with a TypeError when that is not a controller class.
 *
 * @param handler Route handler
 * @returns New route ID
 */
export function RegisterRoute(handler: RouteHandler | LegacyRouteHandler) {
  const controller = controllerOf(handler);
  const id = nextId++;
  const prototype: unknown = controller.prototype;
  const enriched: RouteHandler = {
    ...handler,
    controller,
    proto: handler.proto ?? (isObject(prototype) ? prototype : undefined),
    module: GetResponsibleModule(),
  };
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

type RouteArguments = [
  mode: RouteHandlerMode,
  method: string,
  location?: string,
  priority?: HandlerPriority,
];

function handlerSegment(key: PropertyKey): string | number {
  if (isSymbol(key)) {
    throw new TypeError("Cannot convert a Symbol value to a string");
  }
  return key;
}

/**
 * Register a RouteHandler to the API from a decorator.
 *
 * @param target Controller class
 * @param key Handler key
 * @param descriptor Handler descriptor
 * @param route Handler mode (prefix, handler, postfix, websocket), HTTP method,
 * endpoint location and handler priority, in that order; the location and the
 * priority are optional
 * @returns `{ id }`, an object because {@link Route} returns it as a method
 * decorator's property descriptor
 */
export function ProcessCallback(
  target: any,
  key: PropertyKey,
  descriptor: TypedPropertyDescriptor<RouteHandler["callback"]>,
  ...route: RouteArguments
) {
  const [mode, method, location, priority] = route;
  const callback = descriptor.value;
  if (callback === undefined) {
    throw new TypeError(
      `Route decorators apply to methods; ${String(key)} has no value`,
    );
  }
  const meta = GetMetadata(target.constructor, ControllerMeta);
  const fullLocation =
    `${meta.location}/${location ?? handlerSegment(key)}`.replace(/\/+/g, "/");

  return {
    id: RegisterRoute({
      mode,
      method,
      location: fullLocation,
      callback,
      parameters: meta.getParameterArray(key),
      properties: meta.computed_props,
      controller: target.constructor,
      priority,
    }),
  };
}
