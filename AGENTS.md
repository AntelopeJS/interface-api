# interface-api

The AntelopeJS interface for HTTP and WebSocket APIs, published as `@antelopejs/interface-api`. All of the contract lives in `src/index.ts` and is exported from the package root; there are no subpaths. The HTTP server is in the implementing module, `@antelopejs/api`, not here.

## Versioning of @antelopejs/interface-core

`@antelopejs/interface-core` is a peer dependency, and the devDependency uses the same range. The README compatibility table carries a `docs-compat` marker that the CI docs check compares with `peerDependencies`, so change the range and the table together.

## Tests

- `pnpm test` builds `dist`, then `ajs module test .` reads `src/antelope.test.ts` (`antelopeJs.test` in package.json) and runs the compiled suites in `dist/tests` against `@antelopejs/api` 1.3.0. The first run fetches that module from npm into `.antelope/cache`; later runs reuse the cache. Port 5010 on 127.0.0.1 must be free.
- The suites live in `src/tests/`, not `src/test/`, so `knip.config.ts` lists them as entries.
- `pnpm run checks` does not run the documentation check. CI runs it through `AntelopeJS/tooling-configs/actions/docs` on `README.md` and `docs/`, and type-checks the `docs-check` fences against `docs/tsconfig.json`. To run it locally, check out `AntelopeJS/tooling-configs` at the commit `ci-node.yml` pins, run `npm ci --prefix actions/docs --omit=dev`, then from this repository run `node <checkout>/actions/docs/check.mjs --files "$(printf 'README.md\ndocs')" --typescript-project docs/tsconfig.json`.

## Shipped files

- `skills/` ships in the npm package and reaches users through `antelopeJs.skills`. When a change alters the public API, update `skills/api-interface/SKILL.md`.
- `docs/` ships too, and is the source of interfaces.antelopejs.com/docs/api.

<!-- antelopejs-guardrails:start -->
<!-- Managed by @antelopejs/tooling-configs. `antelopejs-sync` rewrites everything between these markers; write repository-specific guidance outside them. -->

## Guardrails

Finish every change with `pnpm run checks`. It runs typecheck, lint, format, knip, tests, size, ratchet, and sync, and prints only what failed. The change is done when it prints no failure.

The tools enforce most rules, listed in the table at the end. The sections below hold the rules no tool checks.

### Comments

Say it in code. A constraint belongs in a type, a lint rule, or a test. A public item's contract belongs in TSDoc (`/** */`) on that item. The only other comments are lint directives that name their rules, `@ts-expect-error <reason>`, `SAFETY: <reason>` above a type assertion, `/*!` license headers, and bundler or formatter directives.

### Tests

Hold every test you write or keep to this checklist:

- Name the wrong implementation this test fails on. A test with no answer is deleted, not kept.
- No test reads the file it tests. Drive the behaviour through the public interface.
- An invariant over many files is a lint rule, not a test.

### Debt

`guardrails.ratchet.json` records the lint findings and oversize files this repository already had. Its numbers only go down. After you remove debt, run `pnpm run ratchet:update` and commit the lowered file. A rule listed there is off for `oxlint`. The ratchet counts it instead, and the pre-commit hook rejects it on every line you add.

### What enforces what

| Rule                                                                           | Enforced by                               |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| Formatting                                                                     | oxfmt                                     |
| Lint findings are errors; no rule warns                                        | oxlint preset                             |
| Comments are TSDoc, directives, or `SAFETY:` only                              | `antelopejs/no-comments`                  |
| Every test asserts                                                             | `antelopejs/require-assertion`            |
| Tests read no files outside fixtures, helpers, locales                         | `antelopejs/no-fs-read-in-tests`          |
| No assertion that restates a constant                                          | `antelopejs/no-constant-value-assertion`  |
| No test whose only check is "is a function"                                    | `antelopejs/no-typeof-function-only-test` |
| Params ≤ 5, function ≤ 120 lines, file ≤ 500 lines, depth ≤ 4, complexity ≤ 20 | `eslint/max-*`, `eslint/complexity`       |
| Files ≤ 20,000 bytes, tests included                                           | `antelopejs-check-size` (pre-commit)      |
| Existing debt only shrinks                                                     | `antelopejs-ratchet`                      |
| Types check                                                                    | `tsc` (pre-push)                          |
| No dead files, exports, or dependencies                                        | knip                                      |
| Managed files match the pack                                                   | `antelopejs-sync --check`                 |
| A test names the wrong implementation it catches                               | review; no tool                           |

<!-- antelopejs-guardrails:end -->
