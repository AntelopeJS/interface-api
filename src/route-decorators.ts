import { MakeMethodDecorator } from "@antelopejs/interface-core/decorators";

import { ProcessCallback } from "./routes";
import type { HandlerPriority, RouteHandlerMode } from "./route-registry";

/**
 * Generic endpoint (route) decorator.
 *
 * @param mode Handler mode (prefix, handler, postfix, websocket)
 * @param method HTTP method
 * @param location Endpoint location
 * @param priority Handler priority
 */
export const Route = MakeMethodDecorator(ProcessCallback);

/**
 * DELETE endpoint (route) decorator.
 *
 * Creates a handler for HTTP DELETE requests at the specified location.
 * DELETE is used for removing resources and data.
 *
 * @param location Endpoint location relative to the controller path
 * @param mode Handler mode (prefix, handler, postfix, websocket) (default 'handler')
 *
 * Example:
 * ```ts
 * @Delete('users/:id')
 * async deleteUser(@Parameter('id') id: string) {
 *   const deleted = await deleteUserById(id);
 *   if (!deleted) {
 *     return new HTTPResult(404, { error: "User not found" });
 *   }
 *   return new HTTPResult(204);
 * }
 * ```
 */
export const Delete = MakeMethodDecorator(
  (
    target,
    key,
    descriptor,
    location?: string,
    mode: RouteHandlerMode = "handler",
  ) => {
    ProcessCallback(target, key, descriptor, mode, "delete", location);
  },
);

/**
 * GET endpoint (route) decorator.
 *
 * Creates a handler for HTTP GET requests at the specified location.
 * If no location is provided, the method name will be used as the endpoint path.
 *
 * @param location Endpoint location relative to the controller path (optional)
 * @param mode Handler mode - determines when the handler is executed (default: 'handler')
 *
 * Example:
 * ```ts
 * // Handles GET requests at /api/users
 * @Get('users)
 * getUsers() {
 *   return new HTTPResult(200, { users: [...] });
 * }
 * ```
 */
export const Get = MakeMethodDecorator(
  (
    target,
    key,
    descriptor,
    location?: string,
    mode: RouteHandlerMode = "handler",
  ) => {
    ProcessCallback(target, key, descriptor, mode, "get", location);
  },
);

/**
 * POST endpoint (route) decorator.
 *
 * Creates a handler for HTTP POST requests at the specified location.
 * POST is typically used for creating new resources or submitting data to be processed.
 *
 * @param location Endpoint location relative to the controller path
 * @param mode Handler mode (prefix, handler, postfix, websocket) (default 'handler')
 *
 * Example:
 * ```ts
 * @Post('users')
 * createUser(@JsonBody body: { name: string, email: string }) {
 *   const newUser = createUserInDatabase(body);
 *   return new HTTPResult(201, { id: newUser.id, ...body });
 * }
 * ```
 */
export const Post = MakeMethodDecorator(
  (
    target,
    key,
    descriptor,
    location?: string,
    mode: RouteHandlerMode = "handler",
  ) => {
    ProcessCallback(target, key, descriptor, mode, "post", location);
  },
);

/**
 * PUT endpoint (route) decorator.
 *
 * Creates a handler for HTTP PUT requests at the specified location.
 * PUT is typically used for updating existing resources where the client sends
 * the complete updated resource.
 *
 * @param location Endpoint location relative to the controller path
 * @param mode Handler mode (prefix, handler, postfix, websocket) (default 'handler')
 *
 * Example:
 * ```ts
 * @Put('products/:id')
 * updateProduct(
 *   @Parameter('id') id: string,
 *   @JsonBody product: { name: string, price: number }
 * ) {
 *   const updated = updateProductById(id, product);
 *   return new HTTPResult(200, updated);
 * }
 * ```
 */
export const Put = MakeMethodDecorator(
  (
    target,
    key,
    descriptor,
    location?: string,
    mode: RouteHandlerMode = "handler",
  ) => {
    ProcessCallback(target, key, descriptor, mode, "put", location);
  },
);

/**
 * Generic prefix route decorator.
 *
 * Attaches a handler that runs before the main handler for a specific route.
 * Prefix handlers are useful for authentication, input validation, request logging,
 * or other operations that should happen before the main handler is called.
 *
 * @param method HTTP method
 * @param location Endpoint location
 * @param priority Handler priority
 *
 * Example:
 * ```ts
 * @Prefix('*', '')
 * authenticateUser(@Parameter('Authorization', 'header') auth: string) {
 *   if (!auth || !auth.startsWith('Bearer ')) {
 *     return new HTTPResult(401, { error: 'Authentication required' });
 *   }
 *   // Authentication passed, continue to main handler
 * }
 * ```
 */
export const Prefix = MakeMethodDecorator(
  (
    target,
    key,
    descriptor,
    ...route: [method: string, location?: string, priority?: HandlerPriority]
  ) => {
    ProcessCallback(target, key, descriptor, "prefix", ...route);
  },
);

/**
 * Generic postfix route decorator.
 *
 * Attaches a handler that runs after the main handler for a specific route.
 * Postfix handlers are useful for modifying responses, cleaning up resources,
 * or performing any operations that should happen after the main handler has completed.
 *
 * @param method HTTP method
 * @param location Endpoint location
 * @param priority Handler priority
 *
 * Example:
 * ```ts
 * @Postfix('get', '')
 * addHeaders(@Result response: HTTPResult) {
 *   response.addHeader('X-API-Version', '1.0');
 *   response.addHeader('X-Response-Time', getResponseTime());
 * }
 * ```
 */
export const Postfix = MakeMethodDecorator(
  (
    target,
    key,
    descriptor,
    ...route: [method: string, location?: string, priority?: HandlerPriority]
  ) => {
    ProcessCallback(target, key, descriptor, "postfix", ...route);
  },
);

/**
 * Generic monitor route decorator.
 *
 * Attaches a handler that runs after request processing, regardless of success or failure.
 * Monitor handlers are observation-only: their return value is ignored.
 *
 * @param method HTTP method
 * @param location Endpoint location
 * @param priority Handler priority
 *
 * Example:
 * ```ts
 * @Monitor('get', 'users/:id')
 * logRequest(@Context() ctx: RequestContext) {
 *   const status = ctx.response.getStatus();
 *   const message = ctx.error ? String(ctx.error) : 'ok';
 *   Logging.Info(`GET /users/:id -> ${status} (${message})`);
 * }
 * ```
 */
export const Monitor = MakeMethodDecorator(
  (
    target,
    key,
    descriptor,
    ...route: [method: string, location?: string, priority?: HandlerPriority]
  ) => {
    ProcessCallback(target, key, descriptor, "monitor", ...route);
  },
);

/**
 * Websocket endpoint (route) decorator.
 *
 * @param location Endpoint location
 *
 * Example:
 * ```ts
 * @WebsocketHandler('chat')
 * handleChat(@Connection conn: any) {
 *   conn.on('message', (msg) => {
 *     // Echo the message back
 *     conn.send(`Received: ${msg}`);
 *   });
 *
 *   conn.on('close', () => {
 *     console.log('Connection closed');
 *   });
 * }
 * ```
 */
export const WebsocketHandler = MakeMethodDecorator(
  (target, key, descriptor, location?: string) => {
    ProcessCallback(target, key, descriptor, "websocket", "get", location);
  },
);
