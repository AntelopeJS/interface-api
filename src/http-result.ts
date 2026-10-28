import { PassThrough } from "node:stream";
import type { ServerResponse } from "node:http";
import { Logging } from "@antelopejs/interface-core/logging";

const SERVER_ERROR_BODY_LOG_LIMIT = 2048;

/**
 * Result object of an API call.
 *
 * This object contains the status, body & content type, and additional headers.
 */
export class HTTPResult {
  private status = 200;
  private body = "";
  private contentType = "text/plain";
  private stream?: PassThrough;
  private errorLogged = false;
  /**
   * Additional response headers
   */
  private headers?: Record<string, string>;

  /**
   * Create a new HTTPResult from the given body or previous HTTPResult and the provided headers.
   *
   * @param res Body or HTTPResult - The content to be included in the response
   * @param headers Additional headers to apply to the response
   * @param defaultStatus Status code to use if creating a new HTTPResult (default: 200)
   * @returns New HTTPResult with the specified headers
   */
  public static withHeaders(
    res: any,
    headers: Record<string, string>,
    defaultStatus = 200,
  ) {
    const result =
      res instanceof HTTPResult ? res : new HTTPResult(defaultStatus, res);
    for (const [key, val] of Object.entries(headers)) {
      result.addHeader(key, val);
    }
    return result;
  }

  /**
   * @param status Status code
   * @param body Response body
   * @param type Content type
   */
  public constructor(status = 200, body?: unknown, type?: string) {
    this.setBody(body, type);
    this.setStatus(status);
  }

  /**
   * Set the response status.
   *
   * @param status HTTP status code (e.g., 200, 404, 500)
   */
  public setStatus(status: number) {
    this.status = status;
  }

  /**
   * Get the response status.
   *
   * @returns Status code
   */
  public getStatus(): number {
    return this.status;
  }

  /**
   * Set the body of the response and its content type.
   *
   * @param body Body string or object
   * @param type Content type
   */
  public setBody(body: any, type?: string) {
    if (body === undefined || typeof body === "string") {
      this.body = body || "";
      this.contentType = type ?? "text/plain";
    } else {
      this.body = JSON.stringify(body);
      this.contentType = type ?? "application/json";
    }
  }

  /**
   * Get the body of the response.
   *
   * @returns Body
   */
  public getBody(): any {
    return this.body;
  }

  /**
   * Get the content type of the response.
   *
   * @returns Content type
   */
  public getContentType(): string {
    return this.contentType;
  }

  private getMutableHeaders(): Record<string, string> {
    if (!this.headers) {
      this.headers = {};
    }
    return this.headers;
  }

  /**
   * Add an additional header to the response.
   *
   * @param name Header name
   * @param value Header value
   */
  public addHeader(name: string, value: string) {
    this.getMutableHeaders()[name] = value;
  }

  /**
   * Remove an additional header from the response.
   *
   * @param name Header name
   */
  public removeHeader(name: string) {
    if (this.headers) {
      delete this.headers[name];
    }
  }

  /**
   * Get the headers key-value store.
   *
   * @returns Headers object
   */
  public getHeaders(): Record<string, string> {
    return this.getMutableHeaders();
  }

  /**
   * Read the headers without creating the headers key-value store.
   *
   * @returns Current headers, or undefined when no header has been added or retrieved
   */
  public peekHeaders(): Readonly<Record<string, string>> | undefined {
    return this.headers;
  }

  /**
   * Sets this response to be long-lived and gets its writable stream.
   * Use this for long-running responses like Server-Sent Events or streaming data.
   *
   * @param type Content type for the stream (default: 'text/plain')
   * @param status HTTP status code for the response (default: 200)
   * @returns Response write stream for sending data
   */
  public getWriteStream(type = "text/plain", status = 200): PassThrough {
    if (!this.stream) {
      this.stream = new PassThrough();
    }
    this.contentType = type;
    this.status = status;
    this.body = "";
    return this.stream;
  }

  /**
   * Tests if this response is in stream mode.
   *
   * @returns Stream mode enabled
   */
  public isStream(): boolean {
    return !!this.stream;
  }

  private logServerError(res: ServerResponse) {
    if (this.status !== 500 || this.errorLogged) {
      return;
    }
    this.errorLogged = true;
    const body =
      this.body.length > SERVER_ERROR_BODY_LOG_LIMIT
        ? `${this.body.slice(0, SERVER_ERROR_BODY_LOG_LIMIT)}... [truncated]`
        : this.body;
    Logging.Error(
      `HTTP 500 ${res.req?.method ?? "?"} ${res.req?.url ?? "?"}: ${body}`,
    );
  }

  /**
   * Send response without the body.
   *
   * @param res Response object
   */
  public sendHeadResponse(res: ServerResponse) {
    this.logServerError(res);
    res
      .writeHead(this.status, {
        ...this.headers,
        "Content-Type": this.contentType,
      })
      .end();
    if (this.stream) {
      this.stream.end();
    }
  }

  /**
   * Send response.
   *
   * @param res Response object
   */
  public sendResponse(res: ServerResponse, abortStream = false) {
    this.logServerError(res);
    res.writeHead(this.status, {
      ...this.headers,
      "Content-Type": this.contentType,
    });
    if (this.stream && !abortStream) {
      this.stream.pipe(res);
    } else {
      res.end(this.body);
    }
  }
}
