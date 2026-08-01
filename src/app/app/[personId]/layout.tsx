import { notFound } from "next/navigation";
import { FAMILY_APP_NAME } from "@/config/brand";
import { getRepository } from "@/data";
import { getFamilyAuth } from "@/services/family-auth";
import styles from "../app.module.css";

/**
 * Header and page frame for one person. Sticky, because the page is long and it
 * should never be unclear whose settings are being changed.
 */
export default async function PersonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  if (!(await getFamilyAuth().canAccess(personId))) notFound();

  const person = await getRepository().getPerson(personId);
  if (!person) notFound();
  const user = await getFamilyAuth().currentUser();

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.brand}>{FAMILY_APP_NAME}</span>
          <span className={styles.headerPerson}>{person.preferredName}</span>
        </div>
        <span className={styles.who}>{user ? user.name : "Not signed in"}</span>
      </header>
      <main className={styles.main}>{children}</main>
    </>
  );
}
