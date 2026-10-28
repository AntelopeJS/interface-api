import { Socket } from "node:net";
import { IncomingMessage, ServerResponse } from "node:http";

import { HTTPResult, type RequestContext } from "../index";

/**
 * Creates an unconnected request, fed through `push` like a socket would.
 *
 * @returns Request with no headers and no body yet
 */
export function createRequest(): IncomingMessage {
  return new IncomingMessage(new Socket());
}

/**
 * Creates a request context around a real request and response.
 *
 * @param request Request the context wraps
 * @returns Request context with an empty route and a default result
 */
export function createRequestContext(
  request: IncomingMessage = createRequest(),
): RequestContext {
  return {
    rawRequest: request,
    rawResponse: new ServerResponse(request),
    url: new URL("http://127.0.0.1:5010"),
    routeParameters: {},
    response: new HTTPResult(),
  };
}

export interface BodyTestContext {
  context: RequestContext;
  request: IncomingMessage;
}

export function createBodyTestContext(contentLength?: number): BodyTestContext {
  const request = createRequest();
  if (contentLength !== undefined) {
    request.headers["content-length"] = contentLength.toString();
  }
  return { request, context: createRequestContext(request) };
}
