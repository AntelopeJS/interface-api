import { FIRST_SCENARIOS } from "./scenarios-first.ts";
import { SECOND_SCENARIOS } from "./scenarios-second.ts";

export { PRELUDE } from "./scenarios-prelude.ts";

/** The scenario bodies, by journey id, with the JSON line each prints. */
export const SCENARIOS = { ...FIRST_SCENARIOS, ...SECOND_SCENARIOS };
