import { evaluate, formatScorecard, matcherClassifier } from "../personas/eval";

/**
 * Prints the scorecard for the current classifier. `pnpm run eval`.
 *
 * The gate lives in personas/eval.test.ts. This is the readable version, for
 * looking at what changed rather than for failing a build.
 */

const parsed = Number(process.argv[2] ?? 1);
// A non-numeric argument used to yield NaN, run every scenario zero times, and
// print a scorecard of 46 regressions and NaN rates that looked like a disaster.
const runs = Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;

evaluate(matcherClassifier, { runs })
  .then((card) => {
    console.log(formatScorecard(card));
    // Deliberately always exits 0. Four scenarios are red on purpose and this
    // script is a report, not a gate.
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
