import { FAMILY_APP_NAME } from "@/config/brand";
import { getFamilyAuth } from "@/services/family-auth";
import styles from "./app.module.css";

/**
 * The family app shell. This is where the buyer lives, so it carries the brand
 * and, eventually, the subscription. The brand string comes from config because
 * the name is not settled (PROJECT.md section 13).
 */
export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const user = await getFamilyAuth().currentUser();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>{FAMILY_APP_NAME}</span>
        <span className={styles.who}>{user ? `Signed in as ${user.name}` : "Not signed in"}</span>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
