import { Logging } from "@antelopejs/interface-core/logging";
import { GetMetadata, GetResponsibleModule } from "@antelopejs/interface-core";
import type { DecoratorTarget } from "@antelopejs/interface-core/decorators";

import { isSymbol } from "./guards";
import { routesProxy } from "./proxies";
import {
  type ComputedParameter,
  ControllerMeta,
  isControllerClass,
} from "./controller";
import { connectionProvider } from "./parameter-decorators";
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

const CONNECTION_MODES: ReadonlySet<RouteHandlerMode> = new Set([
  "websocket",
  "monitor",
]);

function refuseConnectionOutsideItsModes(
  parameters: Array<ComputedParameter | null>,
  mode: RouteHandlerMode,
  handlerName: string,
) {
  const index = parameters.findIndex(
    (parameter) => parameter?.provider === connectionProvider,
  );
  if (!CONNECTION_MODES.has(mode) && index !== -1) {
    throw new TypeError(
      `@Connection applies in websocket and monitor mode; parameter ${index} of ${handlerName}, declared on it or on a parent controller's method of that name, registers in ${mode} mode`,
    );
  }
}

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
 * @param target Decorator target: the prototype of the decorated method, whose
 * constructor is the controller class
 * @param key Handler key
 * @param descriptor Handler descriptor
 * @param route Handler mode (prefix, handler, postfix, websocket), HTTP method,
 * endpoint location and handler priority, in that order; the location and the
 * priority are optional
 * @returns `{ id }`, an object because {@link Route} returns it as a method
 * decorator's property descriptor
 * @throws {TypeError} When the descriptor has no `value`, because the decorated
 * member is not a method
 * @throws {TypeError} When `target.constructor` is a class that
 * `Controller` did not create, so it has no location; a static method's
 * target is the class itself, whose constructor is `Function`
 * @throws {TypeError} When `key` is a symbol and the route gives no location
 * @throws {TypeError} When a parameter of the handler receives `@Connection`,
 * set on it or inherited from a parent controller's method of the same name,
 * and the mode is neither `websocket` nor `monitor`
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

  const parameters = meta.getParameterArray(key);
  refuseConnectionOutsideItsModes(
    parameters,
    mode,
    `${controller.name}.${String(key)}`,
  );

  return {
    id: RegisterRoute({
      mode,
      method,
      location: fullLocation,
      callback,
      parameters,
      properties: meta.computed_props,
      controller,
      priority,
    }),
  };
}
