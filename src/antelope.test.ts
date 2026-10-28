import { defineConfig } from "@antelopejs/interface-core/config";

export default defineConfig({
  name: "interface-api-test",
  cacheFolder: ".antelope/cache",
  modules: {
    api: {
      source: { type: "local", path: "node_modules/@antelopejs/api" },
      config: {
        publicBaseUrl: "http://127.0.0.1:5010",
        servers: [
          {
            protocol: "http",
            host: "127.0.0.1",
            port: 5010,
          },
        ],
      },
    },
  },
  test: {
    folder: "dist/tests",
  },
});
