import { GetMetadata } from "@antelopejs/interface-core";
import {
  MakeParameterAndPropertyDecorator,
  MakeParameterDecorator,
} from "@antelopejs/interface-core/decorators";

import { isString } from "./guards";
import { DEFAULT_REQUEST_BODY_LIMIT, ReadBody, StreamBody } from "./body";
import {
  ControllerMeta,
  type ParameterModifier,
  type ParameterProvider,
  type RequestContext,
} from "./controller";

/**
 * Set the ParameterProvider on a Handler or Property.
 *
 * @param target Controller class
 * @param key Handler key or Property key
 * @param index If used on a handler, parameter index
 * @param provider ParameterProvider
 *
 * Example:
 * ```ts
 * // Custom user token extractor
 * function getUser(context: RequestContext): User | null {
 *   const token = context.rawRequest.headers.authorization?.split(' ')[1];
 *   return token ? verifyUserToken(token) : null;
 * }
 *
 * // Custom decorator that uses this provider
 * const CurrentUser = MakeParameterDecorator((target, key, param) =>
 *   SetParameterProvider(target, key, param, getUser)
 * );
 * ```
 */
export function SetParameterProvider(
  target: any,
  key: PropertyKey,
  index: number | undefined,
  provider: ParameterProvider,
) {
  GetMetadata(target.constructor, ControllerMeta).setProvider(
    key,
    index,
    provider,
  );
}

/**
 * Add a ParameterModifier on a Handler or Property.
 *
 * @param target Controller class
 * @param key Handler key or Property key
 * @param index If used on a handler, parameter index
 * @param transformer ParameterModifier
 *
 * Example:
 * ```ts
 * // Convert string ID to number
 * function toNumber(context: RequestContext, val: unknown): number {
 *   return parseInt(val as string, 10);
 * }
 *
 * // Create a decorator that adds this modifier
 * const AsNumber = MakeParameterDecorator((target, key, param) =>
 *   AddParameterModifier(target, key, param, toNumber)
 * );
 * ```
 */
export function AddParameterModifier(
  target: any,
  key: PropertyKey,
  index: number | undefined,
  transformer: ParameterModifier,
) {
  GetMetadata(target.constructor, ControllerMeta).addModifier(
    key,
    index,
    transformer,
  );
}

/**
 * Parameter Provider: Request Body.
 *
 * Provides access to the raw HTTP request body as a Buffer.
 * This is useful for processing raw data from the client, such as file uploads
 * or custom data formats.
 *
 * @param limit Maximum body size in bytes
 *
 * Example:
 * ```ts
 * @Post()
 * async uploadFile(@RawBody body: Buffer) {
 *   // Process the raw request body
 *   return new HTTPResult(200, { success: true });
 * }
 * ```
 */
export const RawBody = MakeParameterAndPropertyDecorator(
  (target, key, param, limit: number = DEFAULT_REQUEST_BODY_LIMIT) =>
    SetParameterProvider(target, key, param, (context) =>
      ReadBody(context, limit),
    ),
);

/**
 * Parameter Provider: JSON Request Body.
 *
 * Parses the HTTP request body as JSON and provides the resulting object.
 * This is useful for handling JSON payloads in POST, PUT, and other methods
 * that accept request bodies.
 *
 * @param limit Maximum body size in bytes
 *
 * Example:
 * ```ts
 * @Post()
 * async createUser(@JSONBody body: { name: string; email: string }) {
 *   // body is already parsed as a JavaScript object
 *   const user = await saveUser(body);
 *   return new HTTPResult(201, user);
 * }
 * ```
 */
export const JSONBody = MakeParameterAndPropertyDecorator(
  (target, key, index, limit: number = DEFAULT_REQUEST_BODY_LIMIT) => {
    SetParameterProvider(target, key, index, (ctx: RequestContext) =>
      ReadBody(ctx, limit).then((body: Awaited<RequestContext["body"]>) => {
        if (!body || (body instanceof Buffer && body.length === 0)) {
          return undefined;
        }
        if (isString(body) || body instanceof Buffer) {
          return JSON.parse(body.toString());
        }
        throw new Error("Unable to parse JSON: Invalid body type");
      }),
    );
  },
);

/**
 * Parameter Provider: Streamed Request Body.
 *
 * Provides the HTTP request body as an `AsyncIterable<Uint8Array>`, read as
 * the handler iterates it (see {@link StreamBody}). Use it for uploads larger
 * than {@link RawBody} should buffer: the handler enforces its own limit.
 *
 * Example:
 * ```ts
 * @Put("/upload")
 * async upload(@BodyStream() body: AsyncIterable<Uint8Array>) {
 *   await pipeline(Readable.from(body), createWriteStream(target));
 *   return new HTTPResult(200, { success: true });
 * }
 * ```
 */
export const BodyStream = MakeParameterAndPropertyDecorator(
  (target, key, param) =>
    SetParameterProvider(target, key, param, (context) => StreamBody(context)),
);

/**
 * Parameter Provider: Request Parameter.
 *
 * Extracts a single parameter value from the request. This can be from:
 * - Route parameters (from the URL path)
 * - Query parameters (from the URL query string)
 * - HTTP headers
 *
 * This provider will always return at most one value. For parameters that might
 * have multiple values (e.g., query parameters like ?tag=a&tag=b), use {@link MultiParameter}.
 *
 * @param name Name of the parameter to extract
 * @param source Where to extract the parameter from:
 *   - 'param': Route parameters (e.g., '/users/:id' where 'id' is the parameter)
 *   - 'query': URL query parameters (e.g., '/users?id=123' where 'id' is the parameter)
 *   - 'header': HTTP request headers (e.g., 'Authorization' or 'Content-Type')
 *
 * Example:
 * ```ts
 * @Get('users/:id')
 * getUser(
 *   @Parameter('id') id: string,
 *   @Parameter('fields', 'query') fields?: string,
 *   @Parameter('Authorization', 'header') auth?: string
 * ) {
 *   // id: from route parameter (/users/123)
 *   // fields: from query parameter (?fields=name,email)
 *   // auth: from the Authorization header
 *   return new HTTPResult(200, { id });
 * }
 * ```
 */
export const Parameter = MakeParameterAndPropertyDecorator(
  (
    target,
    key,
    param,
    name: string,
    source: "param" | "query" | "header" = "param",
  ) => {
    SetParameterProvider(target, key, param, (context) => {
      switch (source) {
        case "param":
          return context.routeParameters[name];
        case "query": {
          const val = context.url.searchParams.get(name);
          return val === null ? undefined : val || true;
        }
        case "header": {
          const val2 = context.rawRequest.headers[name.toLowerCase()];
          return Array.isArray(val2) ? val2[0] : val2;
        }
      }
    });
  },
);

/**
 * Parameter Provider: Request Context.
 *
 * Provides access to the complete request context, which includes the raw request,
 * response, URL, route parameters, and other request-related information.
 *
 * This is useful when you need full access to the request details that aren't
 * available through the more specific parameter providers.
 *
 * Example:
 * ```ts
 * @Get()
 * handleRequest(@Context ctx: RequestContext) {
 *   const clientIP = ctx.rawRequest.socket.remoteAddress;
 *   const requestUrl = ctx.url.toString();
 *
 *   return new HTTPResult(200, { ip: clientIP, url: requestUrl });
 * }
 * ```
 */
export const Context = MakeParameterAndPropertyDecorator((target, key, param) =>
  SetParameterProvider(target, key, param, (context) => context),
);

/**
 * Parameter Provider: HTTPResult object.
 *
 * Provides access to the response object, allowing modification of the
 * HTTP response that will be sent to the client.
 *
 * Note: This is typically used in a postfix handler to modify the final response.
 */
export const Result = MakeParameterDecorator((target, key, param) =>
  SetParameterProvider(target, key, param, (context) => context.response),
);

/**
 * Parameter Provider: Response Write Stream.
 *
 * Provides a writable stream for sending data back to the client.
 * This is especially useful for streaming large responses or for
 * implementing server-sent events (SSE).
 *
 * @param type Content type for the stream (default: 'text/plain')
 *
 * Example:
 * ```ts
 * @Get('stream')
 * streamData(@WriteStream('application/octet-stream') stream: PassThrough) {
 *   // Write data to the stream over time
 *   streamData.write('Chunk 1');
 *
 *   setTimeout(() => {
 *     streamData.write('Chunk 2');
 *     streamData.end(); // Close the stream when done
 *   }, 1000);
 *
 *   // No return value needed when using streams
 * }
 * ```
 */
export const WriteStream = MakeParameterDecorator(
  (target, key, param, type?: string) =>
    SetParameterProvider(target, key, param, (context) =>
      context.response.getWriteStream(type),
    ),
);

/**
 * Parameter Modifier: Generic Transformer.
 *
 * Applies a transformation function to the parameter value before it's passed to the handler.
 * This is useful for converting, validating, or enriching parameter values.
 *
 * @param transformer A function that takes the request context and the current parameter value,
 *                   and returns a transformed value
 *
 * Example:
 * ```ts
 * // Convert string ID to number
 * function parseId(context: RequestContext, value: unknown): number {
 *   return parseInt(value as string, 10);
 * }
 *
 * @Get('items/:id')
 * getItem(@Parameter('id') @Transform(parseId) id: number) {
 *   // id is now a number instead of a string
 *   return new HTTPResult(200, { id });
 * }
 * ```
 */
export const Transform = MakeParameterAndPropertyDecorator(
  (target, key, param, transformer: ParameterModifier) =>
    AddParameterModifier(target, key, param, transformer),
);

/**
 * Parameter Provider: WebSocket Connection.
 *
 * Provides access to the WebSocket connection object for WebSocket handlers.
 * This allows you to interact with the WebSocket connection, such as sending
 * messages to the client or handling connection events.
 *
 * This provider can only be used with handlers decorated with @WebsocketHandler.
 *
 * Example:
 * ```ts
 * @WebsocketHandler('chat')
 * handleChatConnection(@Connection connection: WebSocketConnection) {
 *   connection.on('message', (data) => {
 *     // Handle incoming message
 *     connection.send('Received your message: ' + data);
 *   });
 *
 *   connection.on('close', () => {
 *     // Handle connection closed
 *   });
 * }
 * ```
 */
export const Connection = MakeParameterAndPropertyDecorator(
  (target, key, param) =>
    SetParameterProvider(target, key, param, (context) => context.connection),
);

/**
 * Parameter Provider: Multiple Request Parameter values.
 *
 * Extracts multiple values for a parameter from the request as an array.
 * This is useful for parameters that can appear multiple times in a request,
 * such as query parameters with the same name or multi-value headers.
 *
 * See {@link Parameter} for extracting single values.
 *
 * @param name Name of the parameter to extract
 * @param source Where to extract the parameter from:
 *   - 'query': URL query parameters (e.g., '/users?tag=js&tag=api' returns ['js', 'api'])
 *   - 'header': HTTP request headers with multiple values
 *
 * Example:
 * ```ts
 * @Get('search')
 * searchItems(@MultiParameter('tag') tags: string[]) {
 *   // For a request to /search?tag=js&tag=api
 *   // tags will be ['js', 'api']
 *
 *   return new HTTPResult(200, {
 *     tags,
 *     results: findItemsByTags(tags)
 *   });
 * }
 * ```
 */
export const MultiParameter = MakeParameterAndPropertyDecorator(
  (target, key, param, name: string, source: "query" | "header" = "query") => {
    SetParameterProvider(target, key, param, (context) => {
      switch (source) {
        case "query":
          return context.url.searchParams.getAll(name);
        case "header": {
          const val = context.rawRequest.headers[name.toLowerCase()];
          return Array.isArray(val) ? val : val ? [val] : [];
        }
      }
    });
  },
);
