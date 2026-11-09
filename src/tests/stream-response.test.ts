import assert from "node:assert";
import type { PassThrough } from "node:stream";

import {
  Context,
  Controller,
  Get,
  type RequestContext,
  WriteStream,
} from "../index";
import { URL_BASE } from "./fetch-test";

const CHUNK_DELAY_MS = 100;
const CHUNK_COUNT = 3;

async function writeChunks(stream: PassThrough) {
  for (let i = 0; i < CHUNK_COUNT; i++) {
    await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
    stream.write(`Data chunk ${i}\n`);
  }
  stream.end("Stream complete\n");
}

export class TestStreamResponseController extends Controller(
  "/stream-response",
) {
  @Get()
  streamData(
    @Context() context: RequestContext,
    @WriteStream() stream: PassThrough,
  ) {
    stream.write("Starting stream\n");
    writeChunks(stream).catch((error: unknown) => {
      stream.destroy(error instanceof Error ? error : undefined);
    });
    return context.response;
  }
}

describe("Stream response", () => {
  it("Delivers the first chunk before the stream ends", async () => {
    const res = await fetch(`${URL_BASE}/stream-response/streamData`);
    assert(res.body, "Response has a body");
    let body = "";
    let firstChunkAt: number | undefined;
    for await (const text of res.body.pipeThrough(new TextDecoderStream())) {
      firstChunkAt ??= performance.now();
      body += text;
    }
    const endedAt = performance.now();
    assert(firstChunkAt !== undefined, "Response has a chunk");
    assert.equal(
      body,
      "Starting stream\nData chunk 0\nData chunk 1\nData chunk 2\nStream complete\n",
    );
    assert(
      endedAt - firstChunkAt >= CHUNK_DELAY_MS * (CHUNK_COUNT - 1),
      `The first chunk arrived ${Math.round(endedAt - firstChunkAt)} ms before the end`,
    );
  });
});
