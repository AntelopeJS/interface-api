# interface-api

The AntelopeJS interface for HTTP and WebSocket APIs, published as `@antelopejs/interface-api`. The contract is exported from the package root, `src/index.ts`; there are no subpaths. The declarations live in private modules under `src/`, and `src/index.ts` re-exports them: types with `export type`, runtime values with `export import`, which keeps each export a writable data property. The order of those lines is the published key order of the CommonJS exports: keep it and append new exports at the end. `src/proxies.ts` creates every proxy the implementation binds, in their published order. The HTTP server is in the implementing module, `@antelopejs/api`, not here.

## Versioning of @antelopejs/interface-core

`@antelopejs/interface-core` is a peer dependency, and the devDependency uses the same range. The README compatibility table carries a `docs-compat` marker that the CI docs check compares with `peerDependencies`, so change the range and the table together.

## Tests

- `pnpm test` builds `dist`, then `ajs module test .` reads `src/antelope.test.ts` (`antelopeJs.test` in package.json) and runs the compiled suites in `dist/tests` against `@antelopejs/api` 1.7.3, a devDependency loaded as a local module. `pnpm-workspace.yaml` overrides its `@antelopejs/interface-api` dependency with a link to this package, so the suites exercise the local build: without the override they would test the published copy the api module installs. Port 5010 on 127.0.0.1 must be free.
- The suites live in `src/tests/`, not `src/test/`, so `knip.config.ts` lists them as entries.
- The suites import the contract from `../index`, never from `@antelopejs/interface-api`: the package name resolves to the installed published copy unless a self-link exists, and `antelopejs/no-self-import-in-tests` rejects it.
- The compiled suites ship in `dist/tests` and also run from implementation modules (`antelopeJs.implements`), where the core resolver hands out facades for every passed value: assert behaviour and structure, never reference identity.
- `route-lifecycle.test.ts` replaces the register and unregister callbacks of `routesProxy` with a recording provider in its `before` hook, so the cases assert what reaches the registry. The controllers of the other suites register when the files load, before any hook runs, so the api module already serves their routes; a suite that registers routes later would not be served once that hook has run.
- `pnpm run checks` does not run the documentation check. CI runs it through `AntelopeJS/tooling-configs/actions/docs` on `README.md` and `docs/`, and type-checks the `docs-check` fences against `docs/tsconfig.json`. To run it locally, check out `AntelopeJS/tooling-configs` at the commit `ci-node.yml` pins, run `npm ci --prefix actions/docs --omit=dev`, then from this repository run `node <checkout>/actions/docs/check.mjs --files "$(printf 'README.md\ndocs')" --typescript-project docs/tsconfig.json`.

## Shipped files

- `skills/` ships in the npm package and reaches users through `antelopeJs.skills`. When a change alters the public API, update `skills/api-interface/SKILL.md`.
- `docs/` ships too, and is the source of interfaces.antelopejs.com/docs/api.

<!-- antelopejs-guardrails:start -->
<!-- Managed by @antelopejs/tooling-configs. `antelopejs-sync` rewrites everything between these markers; write repository-specific guidance outside them. -->

## Guardrails

CI runs `pnpm run checks` in full on every pull request and reports what failed. The commit hook formats and lints the staged files. Locally, run only the fast check for what you touched:

- `pnpm run typecheck` after you change types or signatures.
- `pnpm exec oxlint <files>` and `pnpm exec oxfmt <files>` on the files you changed.
- One test file, not the suite. In a module that tests with `ajs module test`: `pnpm run build`, then `pnpm exec ajs module test . -f dist/<path>.test.js`.

### Comments

Say it in code: a constraint in a type, a lint rule or a test, a public item's contract in TSDoc. Other comments are lint directives naming their rules, `@ts-expect-error <reason>`, `SAFETY: <reason>` above a type assertion, and license or tool directives. A reason states what the code does now.

### Tests

Each test names the wrong implementation it fails on, or is deleted. Drive behaviour through the public interface. An invariant over many files is a lint rule.

### Review

No tool checks these:

- A type guard checks the nested elements and values it claims.
- A no-upward import rule rejects same-tier peers; probe it with an import.
- A finding only an evasion or a patched internal can trigger goes under Attention and never blocks.

### Suppressions

`guardrails.suppressions.json` caps lint directives, `@ts-expect-error`, `SAFETY:` comments and rules a lint config turns off. Over a cap, fix the code or remove another suppression of that kind; only the operator raises a number. After removing suppressions, run `pnpm run suppressions:update` and commit the file.

<!-- antelopejs-guardrails:end -->
