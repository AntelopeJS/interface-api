import type { IncomingMessage, ServerResponse } from "node:http";
import type { Class } from "@antelopejs/interface-core/decorators";

import type { HTTPResult } from "./http-result";

export type ControllerClass<T extends object = object> = Class<T> & {
  /**
   * Create a sub-controller at the given sub-location.
   *
   * Example:
   * ```ts
   * class MyController extends Controller("admin") {
   *     // This controller is at the /admin location
   * }
   *
   * class SubController extends MyController.extend("user") {
   *     // This controller is at the /admin/user location
   * }
   * ```
   *
   * @param location Sub-location
   * @returns Sub-controller
   */
  extend: <T extends ControllerClass>(this: T, location: string) => T;

  /**
   * Full location of this controller.
   */
  location: string;
};

/**
 * Request context.
 */
export interface RequestContext {
  /**
   * Raw HTTP request.
   */
  rawRequest: IncomingMessage;

  /**
   * Raw HTTP response.
   */
  rawResponse: ServerResponse;

  /**
   * Request URL.
   */
  url: URL;

  /**
   * Request parameters extracted from the URL.
   */
  routeParameters: Record<string, string>;

  /**
   * Raw request body: the pending read that `ReadBody` stores here on
   * its first call, and that later calls reuse. It stays undefined until a
   * handler reads the body.
   */
  body?: Promise<Buffer>;

  /**
   * HTTPResponse object that will be sent on completion.
   */
  response: HTTPResult;

  /**
   * Error thrown during request processing, if any.
   */
  error?: unknown;

  /**
   * Websocket connection (the implementation's `WebsocketConnection`).
   */
  connection?: unknown;
}

/**
 * For computed parameters, the source of the parameter:
 *
 * Provider => [Modifier...] => Parameter/Property in handler
 *
 * @template Value Type of the value the provider produces
 * @param context Request context
 * @returns Value passed to modifiers or directly to the handler
 */
export type ParameterProvider<Value = unknown> = (
  context: RequestContext,
) => Value;

/**
 * For computed parameters, a modifier in the chain of the parameter:
 *
 * Provider => [Modifier...] => Parameter/Property in handler
 *
 * @template Next Type of the value the modifier produces
 * @param context Request context
 * @param previous Previous value in the chain (Return value of provider or previous modifier)
 * @returns Value passed to next modifier or handler
 */
export type ParameterModifier<Next = unknown> = (
  context: RequestContext,
  previous: unknown,
) => Next;

/**
 * Combination of a parameter provider and zero or more parameter modifiers.
 */
export interface ComputedParameter {
  provider?: ParameterProvider;
  modifiers: ParameterModifier[];
}

/**
 * Runs a ComputedParameter with the given context.
 *
 * @param context Request context
 * @param param Computed parameter chain
 * @param obj Controller instance, the `this` of provider and modifier calls
 * @returns Result
 */
export async function computeParameter(
  context: RequestContext,
  param: ComputedParameter | null,
  obj: InstanceType<ControllerClass>,
) {
  if (!param || !param.provider) {
    return undefined;
  }
  let val = await param.provider.apply(obj, [context]);
  for (const modifier of param.modifiers) {
    val = await modifier.apply(obj, [context, val]);
  }
  return val;
}

/**
 * Metadata Class containing the Controller information.
 */
export class ControllerMeta {
  /**
   * Key symbol
   */
  public static key = Symbol();

  /**
   * Full location or the controller
   */
  public readonly location: string;

  /**
   * Computed properties of the Controller (available to every handler)
   */
  public computed_props: Record<PropertyKey, ComputedParameter> = {};

  /**
   * Computed parameters (available only to its handler)
   */
  public computed_params: Record<
    PropertyKey,
    Record<number, ComputedParameter>
  > = {};

  constructor(target: { location: string }) {
    this.location = target.location;
  }

  inherit(parent: ControllerMeta) {
    this.computed_props = { ...parent.computed_props, ...this.computed_props };
    this.computed_params = {
      ...parent.computed_params,
      ...this.computed_params,
    };
  }

  /**
   * Get the ComputedParameter on a given key
   *
   * @param key Handler key or Property key
   * @param param If used on a handler, parameter index
   * @returns ComputedParameter
   */
  getComputedParameter(key: PropertyKey, param: number | undefined) {
    if (param === undefined) {
      if (!(key in this.computed_props)) {
        this.computed_props[key] = { modifiers: [] };
      }
      return this.computed_props[key];
    } else {
      if (!(key in this.computed_params)) {
        this.computed_params[key] = [];
      }
      if (!(param in this.computed_params[key])) {
        this.computed_params[key][param] = { modifiers: [] };
      }
      return this.computed_params[key][param];
    }
  }

  /**
   * Sets the parameter provider of the ComputedParameter on the given key
   *
   * @param key Handler key or Property key
   * @param param If used on a handler, parameter index
   * @param modifier Parameter provider
   */
  setProvider(
    key: PropertyKey,
    param: number | undefined,
    provider: ParameterProvider,
  ) {
    this.getComputedParameter(key, param).provider = provider;
  }

  /**
   * Adds a parameter modifier to the ComputedParameter on the given key
   *
   * @param key Handler key or Property key
   * @param param If used on a handler, parameter index
   * @param modifier Parameter modifier
   */
  addModifier(
    key: PropertyKey,
    param: number | undefined,
    modifier: ParameterModifier,
  ) {
    this.getComputedParameter(key, param).modifiers.push(modifier);
  }

  /**
   * Get the list of ComputedParameter for a given handler
   *
   * @param key Handler key
   * @returns ComputedParameter list
   */
  getParameterArray(key: PropertyKey) {
    const paramsMap = this.computed_params[key] || {};
    const paramsMax = Object.keys(paramsMap)
      .map((val) => parseInt(val, 10))
      .reduce((a, b) => Math.max(a, b), 0);
    const params = [];
    for (let i = 0; i <= paramsMax; ++i) {
      params[i] = i in paramsMap ? paramsMap[i] : null;
    }
    return params;
  }
}

/**
 * Create a new API Controller at the given root location.
 *
 * @param location Root location
 * @param base Optional base Controller to inherit properties from
 * @returns New Controller
 */
export function Controller(location: string): ControllerClass;
export function Controller<T extends object>(
  location: string,
  base: Class<T>,
): ControllerClass<T>;
export function Controller<T extends object>(
  location: string,
  base?: Class<T>,
): ControllerClass<T> | ControllerClass {
  if (!base) {
    return Object.assign(class {}, { location, extend });
  }
  return Object.assign(class extends base {}, { location, extend });
}

function extend<E extends ControllerClass>(this: E, location: string): E {
  return Object.assign(class extends this {}, {
    location: `${this.location}/${location}`,
    extend,
  });
}

/**
 * Create a partial controller that reuses the same location as the given controller.
 *
 * This is useful when routes are split across multiple files while sharing the
 * same controller context/computed properties.
 *
 * @param controller Base controller class
 * @returns Controller class at the same location
 */
export function PartialController<T extends object>(
  controller: ControllerClass<T>,
): ControllerClass<T> {
  return Controller(controller.location, controller);
}
