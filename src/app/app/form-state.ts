import type { WordingProblem } from "@/domain/answer-policy/wording";

/**
 * What a form gets back from a server action. Actions return this rather than
 * throwing, because a validation failure here is an expected outcome that a
 * family member has to be able to read and act on, not an error page.
 */
export interface FormState {
  status: "idle" | "ok" | "error";
  /** One line, shown next to the button. */
  message?: string;
  /** Fuller explanations, shown under the form. */
  problems?: string[];
}

export const IDLE: FormState = { status: "idle" };

export function ok(message: string): FormState {
  return { status: "ok", message };
}

export function failed(problems: string[], message = "Not saved"): FormState {
  return { status: "error", message, problems };
}

/**
 * Wording problems in the family's own terms. The codes come from the same
 * guards the answer engine runs at read time, so what the form refuses is
 * exactly what the device would have refused to say.
 */
const PROBLEM_MESSAGES: Record<WordingProblem["code"], string> = {
  "too-long":
    "Too long to say out loud. Keep it to one or two short sentences, because a longer answer is gone before it lands.",
  "mentions-death-under-validation":
    "This mentions a death, but you asked Nora to go along with what they believe. Choose telling the truth, or write words that do not raise it.",
  "mentions-death-under-redirection":
    "This mentions a death, but you asked Nora to move gently past it. Choose telling the truth, or write words that do not raise it.",
  "implies-alive-under-truthfulness":
    "This suggests they are still around, but you asked Nora to tell the truth. One of the two has to change.",
  empty: "Nothing written here yet.",
};

export function describeProblems(problems: WordingProblem[]): string[] {
  const seen = new Set<string>();
  const described: string[] = [];
  for (const problem of problems) {
    const language = problem.language === "af" ? "Afrikaans" : "English";
    const line = `${language}: ${PROBLEM_MESSAGES[problem.code]}`;
    if (seen.has(line)) continue;
    seen.add(line);
    described.push(line);
  }
  return described;
}
