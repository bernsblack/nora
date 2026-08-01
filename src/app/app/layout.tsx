import styles from "./app.module.css";

/**
 * The family app shell. The header lives one level down, in the layout for a
 * particular person, so that it can say whose settings are on screen. On a long
 * scrolling page that is the thing worth keeping in view.
 */
export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
