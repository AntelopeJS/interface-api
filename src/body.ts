import type { IncomingMessage } from "node:http";

import { HTTPResult } from "./http-result";
import type { RequestContext } from "./controller";

const PAYLOAD_TOO_LARGE_STATUS = 413;

const PAYLOAD_TOO_LARGE_MESSAGE = "Payload Too Large";

/**
 * Default maximum buffered request body size in bytes.
 */
export const DEFAULT_REQUEST_BODY_LIMIT = 1024 * 1024;

interface RequestBodyState {
  buffers: Buffer[];
  didExceed: boolean;
  length: number;
  limit: number;
}

const requestBodyStates = new WeakMap<RequestContext, RequestBodyState>();

/**
 * Get the body from a RequestContext object.
 *
 * @param context Request context
 * @param limit Maximum body size in bytes
 * @returns Body buffer
 */
export function ReadBody(
  context: RequestContext,
  limit = DEFAULT_REQUEST_BODY_LIMIT,
): Promise<Buffer> {
  let state = requestBodyStates.get(context);
  let shouldRestart = false;
  if (state) {
    const previousLimit = state.limit;
    state.limit = Math.max(state.limit, limit);
    shouldRestart =
      state.didExceed &&
      state.limit > previousLimit &&
      state.length <= state.limit;
  } else {
    state = { buffers: [], didExceed: false, length: 0, limit };
    requestBodyStates.set(context, state);
  }
  if (context.body === undefined || shouldRestart) {
    state.didExceed = false;
    context.body = Promise.resolve().then(() =>
      readRequestBody(context.rawRequest, state),
    );
  }
  return (context.body as Promise<Buffer>).then((body) =>
    enforceBodyLimit(body, limit),
  );
}

function readRequestBody(
  request: IncomingMessage,
  state: RequestBodyState,
): Promise<Buffer> {
  const contentLength = Number(request.headers["content-length"]);
  if (contentLength > state.limit) {
    state.didExceed = true;
    request.pause();
    return Promise.reject(createPayloadTooLargeResult());
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      request.off("data", onData);
      request.off("end", onEnd);
      request.off("error", onError);
    };
    const onData = (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      state.length += buffer.length;
      state.buffers.push(buffer);
      if (state.length <= state.limit) {
        return;
      }
      state.didExceed = true;
      cleanup();
      request.pause();
      reject(createPayloadTooLargeResult());
    };
    const onEnd = () => {
      cleanup();
      resolve(joinRequestBody(state));
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    request.on("data", onData);
    request.once("end", onEnd);
    request.once("error", onError);
    request.resume();
  });
}

function joinRequestBody(state: RequestBodyState): Buffer {
  const body = Buffer.concat(state.buffers, state.length);
  state.buffers = [];
  return body;
}

function enforceBodyLimit(body: Buffer, limit: number): Buffer {
  if (body.length > limit) {
    throw createPayloadTooLargeResult();
  }
  return body;
}

function createPayloadTooLargeResult(): HTTPResult {
  return new HTTPResult(PAYLOAD_TOO_LARGE_STATUS, PAYLOAD_TOO_LARGE_MESSAGE);
}

/**
 * Get the body from a RequestContext object as a stream of chunks, read as
 * the handler iterates and never buffered whole: no size limit applies, the
 * handler bounds what it accepts. Stopping early (a `break`, or a throw from
 * the loop) discards the rest of the body, so the client still receives the
 * response.
 *
 * Read a body once: through this stream, or through {@link ReadBody}.
 *
 * @param context Request context
 * @returns Body chunks
 */
export async function* StreamBody(
  context: RequestContext,
): AsyncGenerator<Uint8Array, void, undefined> {
  const request = context.rawRequest;
  try {
    for await (const chunk of request.iterator({ destroyOnReturn: false }))
      yield chunk;
  } finally {
    request.resume();
  }
}
