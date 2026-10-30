import { Socket } from "node:net";
import { IncomingMessage, ServerResponse } from "node:http";

import { HTTPResult, type RequestContext } from "../index";
import { isString } from "../guards";

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

/**
 * Checks every required field of a request context, so a value read from a
 * spy narrows to it for the right reasons.
 *
 * @param value Value to test
 * @returns True when the value is a request context
 */
export function isRequestContext(value: unknown): value is RequestContext {
  return (
    typeof value === "object" &&
    value !== null &&
    "rawRequest" in value &&
    value.rawRequest instanceof IncomingMessage &&
    "rawResponse" in value &&
    value.rawResponse instanceof ServerResponse &&
    "url" in value &&
    value.url instanceof URL &&
    "routeParameters" in value &&
    typeof value.routeParameters === "object" &&
    value.routeParameters !== null &&
    Object.values(value.routeParameters).every(isString) &&
    "response" in value &&
    value.response instanceof HTTPResult
  );
}
