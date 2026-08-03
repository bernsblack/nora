"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
import { IDLE, type FormState } from "./form-state";
import styles from "./app.module.css";

/**
 * A form that tells you what happened. Every write in the family app goes
 * through this, because someone editing what a device will say to their mother
 * should never be left guessing whether it saved.
 */

interface ActionFormProps {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  /** Shown while the action is in flight. */
  pendingLabel?: string;
  children: React.ReactNode;
  /** Extra note under the button, always visible. */
  note?: React.ReactNode;
  /**
   * Quiet for actions that keep the page as it is, like refreshing a calendar.
   * Only the writes a family member came here to make are primary.
   */
  variant?: "primary" | "quiet";
}

export function ActionForm({
  action,
  submitLabel,
  pendingLabel = "Saving",
  children,
  note,
  variant = "primary",
}: ActionFormProps) {
  const form = useRef<HTMLFormElement>(null);
  const submitted = useRef<FormData | null>(null);

  /**
   * The wrapper runs on the client and keeps a copy of what was sent, so a
   * refusal can put it back. See restore below.
   */
  const remembering = useCallback(
    async (state: FormState, formData: FormData) => {
      submitted.current = formData;
      return action(state, formData);
    },
    [action],
  );

  const [state, formAction, pending] = useActionState(remembering, IDLE);

  /**
   * React clears an uncontrolled form once its action resolves. That is right
   * after something is added and wrong after something is refused: the answer
   * policy form is where a family member writes a sentence they have thought
   * hard about, and throwing it away to show them why it was refused would be
   * its own small cruelty. So on a refusal, put back what they sent.
   */
  useEffect(() => {
    if (state.status !== "error") return;
    const element = form.current;
    const sent = submitted.current;
    if (!element || !sent) return;

    for (const field of Array.from(element.elements)) {
      const named = field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (!named.name) continue;
      if (named instanceof HTMLInputElement && named.type === "checkbox") {
        named.checked = sent.has(named.name);
        continue;
      }
      /*
       * Radios carry their answer in `checked`, not in `value`. Falling through
       * to the assignment below would set every radio sharing a name to the one
       * value that was submitted, so three options with three different labels
       * would all submit the same thing, and the next click would save a mode
       * the family member never chose. On the answer policy that is the wrong
       * sentence said to somebody about whether their husband is alive.
       */
      if (named instanceof HTMLInputElement && named.type === "radio") {
        named.checked = sent.get(named.name) === named.value;
        continue;
      }
      const value = sent.get(named.name);
      if (typeof value === "string") named.value = value;
    }
  }, [state]);

  return (
    <form ref={form} action={formAction} className={styles.form}>
      <div className={styles.grid}>{children}</div>

      {state.status === "error" && state.problems && state.problems.length > 0 ? (
        <ul className={styles.problems} role="alert" data-testid="problems">
          {state.problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : null}

      <div className={styles.actions}>
        <button
          className={variant === "quiet" ? styles.buttonQuiet : styles.button}
          type="submit"
          disabled={pending}
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        <span
          className={state.status === "error" ? styles.failure : styles.success}
          aria-live="polite"
        >
          {pending ? "" : state.message}
        </span>
      </div>

      {note ? <p className={styles.note}>{note}</p> : null}
    </form>
  );
}

/**
 * A form that only removes something. No state to report: the row it belonged
 * to is gone, which is the confirmation.
 */
export function RemoveForm({
  action,
  label = "Remove",
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      {children}
      <button className={styles.buttonQuiet} type="submit">
        {label}
      </button>
    </form>
  );
}
