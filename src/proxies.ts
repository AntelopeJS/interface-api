import {
  InterfaceFunction,
  RegisteringProxy,
} from "@antelopejs/interface-core";

import type { ControllerClass, RequestContext } from "./controller";
import { RoutesProxy, type RouteHandler } from "./route-registry";

export const internalRoutesProxy = new RegisteringProxy<
  (id: string, handler: RouteHandler) => void
>();

/**
 * Gets the instance of a given Controller for the active request.
 *
 * @param cl Controller class
 * @param context Request context
 * @returns Controller instance
 */
export const GetControllerInstance: <T>(
  cl: ControllerClass<T>,
  context: RequestContext,
) => Promise<T> = InterfaceFunction();

/**
 * Start listening on all configured servers.
 */
export const Listen: () => Promise<void> = InterfaceFunction();

/**
 * Allowed CORS origin.
 *
 * Either a single origin (exact string or RegExp) or a list of origins.
 */
export type AllowedOrigin = string | RegExp | Array<string | RegExp>;

/**
 * CORS configuration.
 */
export interface CorsConfig {
  /**
   * Origins allowed to access the API. CORS is disabled when omitted.
   */
  allowedOrigins?: AllowedOrigin;

  /**
   * HTTP methods allowed for cross-origin requests.
   */
  allowedMethods?: string[];

  /**
   * Request headers allowed for cross-origin requests
   * (Access-Control-Allow-Headers). When omitted, the implementation
   * reflects the headers requested by the client.
   */
  allowedHeaders?: string[];

  /**
   * Whether to send the Access-Control-Allow-Credentials header.
   */
  credentials?: boolean;

  /**
   * Lifetime in seconds of the preflight response (Access-Control-Max-Age).
   */
  maxAge?: number;
}

/**
 * Returns the current CORS configuration.
 *
 * @returns Current CORS configuration.
 */
export const GetCorsConfig: () => Promise<CorsConfig> = InterfaceFunction();

/**
 * Replaces the CORS configuration. Changes apply to subsequent requests
 * without restarting the servers.
 *
 * @param config New CORS configuration.
 */
export const SetCorsConfig: (config: CorsConfig) => Promise<void> =
  InterfaceFunction();

/**
 * @internal
 */
export const routesProxy: RegisteringProxy<
  (id: string, handler: RouteHandler) => void
> = new RoutesProxy();
