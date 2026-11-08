import { Logging } from "@antelopejs/interface-core/logging";
import { GetMetadata, GetResponsibleModule } from "@antelopejs/interface-core";
import type { DecoratorTarget } from "@antelopejs/interface-core/decorators";

import { isSymbol } from "./guards";
import { routesProxy } from "./proxies";
import { ControllerMeta, isControllerClass } from "./controller";
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
 * @throws {TypeError} When the handler names no {@link RouteHandler.controller}
 */
export function RegisterRoute(handler: RouteHandler) {
  if (!handler.controller) {
    throw new TypeError(
      `Cannot register ${handler.method.toUpperCase()} ${handler.location}: RouteHandler.controller is required`,
    );
  }
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

type RouteArguments = [
  mode: RouteHandlerMode,
  method: string,
  location?: string,
  priority?: HandlerPriority,
];

function handlerSegment(
  controllerName: string,
  key: PropertyKey,
): string | number {
  if (isSymbol(key)) {
    throw new TypeError(
      `Route decorators on a symbol-keyed method need a location; ${controllerName}[${String(key)}] has none`,
    );
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
  target: DecoratorTarget,
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
  const controller = target.constructor;
  if (!isControllerClass(controller)) {
    throw new TypeError(
      `Route decorators apply to Controller classes; ${controller.name} has no location`,
    );
  }
  const meta = GetMetadata(controller, ControllerMeta);
  const segment = location ?? handlerSegment(controller.name, key);
  const joined =
    segment === "" ? controller.location : `${controller.location}/${segment}`;
  const fullLocation = (joined || "/").replace(/\/+/g, "/");

  return {
    id: RegisterRoute({
      mode,
      method,
      location: fullLocation,
      callback,
      parameters: meta.getParameterArray(key),
      properties: meta.computed_props,
      controller,
      priority,
    }),
  };
}
