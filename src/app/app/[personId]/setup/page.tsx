import { notFound, redirect } from "next/navigation";
import { getRepository } from "@/data";
import { setupComplete } from "@/domain/setup";
import { ANSWER_POLICY_MODES } from "@/domain/types";
import { getFamilyAuth } from "@/services/family-auth";
import { ActionForm } from "../../action-form";
import { completeSetup } from "../../actions";
import styles from "../../app.module.css";

/**
 * Setting a person up, which is one decision long.
 *
 * PROJECT.md section 6 says the family sets the answer policy "during setup, as
 * an explicit choice, not a default they discover later". Until this page
 * existed the app had no setup at all: the policy lived in a settings section
 * with the fallback mode already selected in the dropdown, so a family member
 * who never scrolled to it had a policy chosen for them by a form and the
 * screen presented it as theirs.
 *
 * There is deliberately only one step. A longer wizard collecting names and
 * room numbers would bury the one question that matters underneath the ones
 * that do not, and every other field on the person already has a safe value
 * that can be changed at any time. This one cannot have a safe value, because
 * there is no answer to it that is right for every family. That is the whole
 * reason the brief makes it a choice.
 */

const MODE_LABELS: Record<(typeof ANSWER_POLICY_MODES)[number], string> = {
  "gentle-redirection": "Move gently past it, without saying anything untrue",
  validation: "Go along with what they believe, in words you write",
  truthful: "Tell them the truth, gently, when they ask",
};

/**
 * No mode is recommended and none is described as usual or common. Dementia
 * care has argued this for decades without settling it, the brief hands the
 * decision to the family, and a sentence saying what most families do is a
 * default wearing a description, on the one screen built to stop that.
 *
 * The voice name is a parameter rather than a word. It is per person and the
 * family chooses it, and the product name is unresolved (PROJECT.md 13).
 */
function modeDetail(voiceName: string): Record<(typeof ANSWER_POLICY_MODES)[number], string> {
  return {
    "gentle-redirection": `${voiceName} answers something true and kind that does not raise the death, and moves on.`,
    validation: `${voiceName} answers in words you write yourself, which may go along with what they believe. You write those words for each person, in the settings after this.`,
    truthful: `${voiceName} tells them, gently and briefly, when they ask. It will never volunteer it and never add detail, but it will not say anything that suggests the person is still alive.`,
  };
}

/*
 * Rendered per request. The "do not ask a family who already decided to decide
 * again" property depends on reading the policy on every visit, and a route
 * cached copy of this form would ask them again after they had answered.
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ personId: string }>;
}

export default async function SetupPage({ params }: PageProps) {
  const { personId } = await params;
  if (!(await getFamilyAuth().canAccess(personId))) notFound();

  const repository = getRepository();
  const person = await repository.getPerson(personId);
  if (!person) notFound();

  const policy = await repository.getAnswerPolicy(personId);
  // Setup is reachable again on purpose, so a family can change their mind
  // without hunting for it. What it must not do is ask a family that has
  // already decided to decide again every time they open the app.
  if (setupComplete(policy)) redirect(`/app/${personId}`);

  const detail = modeDetail(person.voiceName);

  return (
    <section className={styles.section} data-testid="setup">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>One thing to decide before we start</h2>
        <p className={styles.policyWarning}>
          {person.preferredName} may ask where someone who has died is, and may ask many times a
          day. There is no right answer to this. Families disagree about it and so do the people
          who do this for a living, so it is yours to decide rather than ours.
        </p>
        <p className={styles.note}>
          Whatever you choose, {person.voiceName} will never raise a death on its own, never add
          detail to one, and never say more than a sentence or two. You can change this later.
        </p>
      </div>

      <ActionForm
        action={completeSetup}
        submitLabel="Save and continue"
        note={
          /*
           * Said here because it is not obvious and the app used to claim the
           * opposite. answerSensitive returns unknown-subject-redirect for a
           * subject with no topic, before the mode is ever read, so until the
           * family writes somebody down all three choices behave the same.
           * Telling them that here is the difference between a decision they
           * think is in force and one that is.
           */
          <>
            This takes effect for each person you write down in the settings. Until you add
            someone, {person.voiceName} says the same gentle thing about anyone{" "}
            {person.preferredName} asks after: that they are not here right now.
          </>
        }
      >
        <input type="hidden" name="personId" value={person.id} />
        <fieldset className={styles.choices}>
          <legend className={styles.choicesLegend}>
            When {person.preferredName} asks about someone who has died
          </legend>

          {/*
            Radios with nothing checked, not a select. A select always has a
            value, so it cannot express "not answered yet", and the default it
            shows is precisely the default this screen exists to stop being
            adopted by accident.

            `completeSetup` refuses a submission with no mode as well. That is
            not a no-JavaScript guarantee, and it was described as one until a
            review pointed out that ActionForm posts through useActionState and
            has no server action to fall back to. It is defence against a form
            posted by something other than this page.
          */}
          {ANSWER_POLICY_MODES.map((mode) => (
            <label key={mode} className={styles.choice}>
              <input type="radio" name="defaultMode" value={mode} required />
              <span>
                <strong>{MODE_LABELS[mode]}</strong>
                <span className={styles.choiceDetail}>{detail[mode]}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </ActionForm>
    </section>
  );
}
