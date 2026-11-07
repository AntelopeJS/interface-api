---
covers:
  - src/controller.ts
  - src/guards.ts
  - src/http-result.ts
docs:
  - docs/2.controllers.md
journeys:
  - controller-hierarchy
---

# Controllers

A module author groups routes under a base path with `Controller(location)`, nests them with `extend`, gives instances a base class with `Controller(location, Base)` and splits one controller across files with `PartialController`.

## Sub-features

- `controller-hierarchy`: `extend` joins the parent location, a sub-controller is an instance of its parent, `Controller(location, Base)` extends `Base`, and a partial controller keeps the location and the computed properties of the controller it extends.

## How to get to it (user POV)

- `class Users extends Controller("/users")`, `class Admin extends Users.extend("admin")`.

## Driving it with antelopejs-verify

```bash
pnpm exec antelopejs-verify journey "$RUN" controllers
```

## Gotchas

- The journeys call the decorators by hand on the packed `dist/index.js`, since the verification harness compiles no decorators.
- `GetControllerInstance` builds the instance in the implementing module, so its "computed properties are set before the promise resolves" is not driven here (see the pull request).
