import Link from "next/link";
import { redirect } from "next/navigation";
import { getRepository } from "@/data";
import { getFamilyAuth } from "@/services/family-auth";
import styles from "./app.module.css";

/**
 * Most families have one person. Rather than make them pick from a list of one,
 * go straight there.
 */
export default async function FamilyIndexPage() {
  const user = await getFamilyAuth().currentUser();
  if (!user) redirect("/");

  const people = (await getRepository().listPeople()).filter((person) =>
    user.personIds.includes(person.id),
  );

  if (people.length === 1) redirect(`/app/${people[0].id}`);

  return (
    <section className={styles.section}>
      <h1 className={styles.sectionTitle}>Who are you keeping up to date?</h1>
      <ul className={styles.list}>
        {people.map((person) => (
          <li key={person.id} className={styles.row}>
            <div className={styles.rowMain}>
              <Link href={`/app/${person.id}`}>{person.preferredName}</Link>
            </div>
          </li>
        ))}
      </ul>
      {people.length === 0 ? <p className={styles.note}>Nobody set up yet.</p> : null}
    </section>
  );
}
