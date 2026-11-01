import * as body from "./body";
import * as routes from "./routes";
import * as proxies from "./proxies";
import * as controller from "./controller";
import * as httpResult from "./http-result";
import * as routeRegistry from "./route-registry";
import * as routeDecorators from "./route-decorators";
import * as parameterDecorators from "./parameter-decorators";
import type { RegisteringProxy } from "@antelopejs/interface-core";
import type { RouteHandler } from "./route-registry";

export type {
  ComputedParameter,
  ControllerClass,
  ParameterModifier,
  ParameterProvider,
  RequestContext,
} from "./controller";
export type { AllowedOrigin, CorsConfig } from "./proxies";
export type {
  RegisteredRouteHandler,
  RouteHandler,
  RouteHandlerMode,
} from "./route-registry";

/**
 * @internal
 */
export namespace internal {
  export const routesProxy: RegisteringProxy<
    (id: string, handler: RouteHandler) => void
  > = proxies.internalRoutesProxy;
}

export import DEFAULT_REQUEST_BODY_LIMIT = body.DEFAULT_REQUEST_BODY_LIMIT;
export import HTTPResult = httpResult.HTTPResult;
export import HandlerPriority = routeRegistry.HandlerPriority;
export import ControllerMeta = controller.ControllerMeta;
export import GetControllerInstance = proxies.GetControllerInstance;
export import Listen = proxies.Listen;
export import GetCorsConfig = proxies.GetCorsConfig;
export import SetCorsConfig = proxies.SetCorsConfig;
export import routesProxy = proxies.routesProxy;
export import Route = routeDecorators.Route;
export import Delete = routeDecorators.Delete;
export import Get = routeDecorators.Get;
export import Post = routeDecorators.Post;
export import Put = routeDecorators.Put;
export import Prefix = routeDecorators.Prefix;
export import Postfix = routeDecorators.Postfix;
export import Monitor = routeDecorators.Monitor;
export import WebsocketHandler = routeDecorators.WebsocketHandler;
export import RawBody = parameterDecorators.RawBody;
export import JSONBody = parameterDecorators.JSONBody;
export import BodyStream = parameterDecorators.BodyStream;
export import Parameter = parameterDecorators.Parameter;
export import Context = parameterDecorators.Context;
export import Result = parameterDecorators.Result;
export import WriteStream = parameterDecorators.WriteStream;
export import Transform = parameterDecorators.Transform;
export import Connection = parameterDecorators.Connection;
export import MultiParameter = parameterDecorators.MultiParameter;
export import computeParameter = controller.computeParameter;
export import Controller = controller.Controller;
export import PartialController = controller.PartialController;
export import getRegisteredRouteHandlers = routeRegistry.getRegisteredRouteHandlers;
export import RegisterRoute = routes.RegisterRoute;
export import UnregisterRoute = routes.UnregisterRoute;
export import getRegisteredRoutes = routeRegistry.getRegisteredRoutes;
export import ProcessCallback = routes.ProcessCallback;
export import ReadBody = body.ReadBody;
export import SetParameterProvider = parameterDecorators.SetParameterProvider;
export import AddParameterModifier = parameterDecorators.AddParameterModifier;
export import StreamBody = body.StreamBody;
