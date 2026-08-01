import Link from "next/link";
import { redirect } from "next/navigation";
import { FAMILY_APP_NAME } from "@/config/brand";
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
    <>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.brand}>{FAMILY_APP_NAME}</span>
        </div>
        <span className={styles.who}>{user.name}</span>
      </header>
      <main className={styles.main}>
        <section className={styles.section}>
          <h1 className={styles.sectionTitle}>Who are you keeping up to date?</h1>
          {people.length === 0 ? (
            <p className={styles.empty}>Nobody is set up yet.</p>
          ) : (
            <ul className={styles.list}>
              {people.map((person) => (
                <li key={person.id} className={styles.row}>
                  <div className={styles.rowMain}>
                    <Link href={`/app/${person.id}`}>{person.preferredName}</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
