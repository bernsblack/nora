/**
 * Brand strings are unresolved (PROJECT.md section 13). Nothing user facing may
 * hardcode a product name. Everything reads from here, and here reads from env
 * so a rename is a config change and not a refactor.
 *
 * The voice name is deliberately absent from this file. It is per person,
 * chosen by the family at setup, and lives on the person record.
 */

/** Company and family app brand. Placeholder until naming is settled. */
export const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Nora";

/** Name of the family facing app, shown in its own chrome. */
export const FAMILY_APP_NAME = process.env.NEXT_PUBLIC_FAMILY_APP_NAME ?? COMPANY_NAME;

/**
 * Fallback voice name, used only when a person record has none. Families are
 * prompted to choose one at setup, so this should rarely be seen.
 */
export const DEFAULT_VOICE_NAME = process.env.NEXT_PUBLIC_DEFAULT_VOICE_NAME ?? "Nora";
