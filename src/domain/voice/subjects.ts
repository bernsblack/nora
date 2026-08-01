import type { RoomData } from "../room-view";
import type { AnswerPolicy, LocalizedText } from "../types";

/**
 * Who the device is allowed to recognise being asked about.
 *
 * Only people the family put there: the subjects of the answer policy, the
 * faces on the screen, and expected visitors. Inventing a subject out of a
 * misheard word is how a device ends up saying something about a stranger.
 *
 * People ask by relationship far more often than by name, and more so as the
 * name goes. "Where is my husband" is the sentence PROJECT.md section 6 uses as
 * its example, and it contains no name at all, so every subject carries the
 * relationship as an alias too.
 */

export interface KnownSubject {
  /** What the answer policy calls them. What an answer will use. */
  name: string;
  /** Other ways the same person gets asked for, lowercase. */
  aliases: string[];
}

/**
 * The family writes a relationship from the device's side, "your husband",
 * because that is how it would be said back. The person in the room says it
 * from their own side, "my husband". Both have to match.
 */
const POSSESSIVE_SWAPS: [RegExp, string][] = [
  [/^your\s+/i, "my "],
  [/^jou\s+/i, "my "],
  [/^u\s+/i, "my "],
];

export function relationshipAliases(relationship: LocalizedText | undefined): string[] {
  if (!relationship) return [];
  const aliases = new Set<string>();

  for (const written of Object.values(relationship)) {
    const text = written?.trim().toLowerCase();
    if (!text) continue;
    aliases.add(text);
    for (const [pattern, replacement] of POSSESSIVE_SWAPS) {
      if (pattern.test(text)) aliases.add(text.replace(pattern, replacement));
    }
  }
  return [...aliases];
}

export function knownSubjects(
  data: RoomData,
  policy: AnswerPolicy | null,
): KnownSubject[] {
  const byName = new Map<string, KnownSubject>();

  const add = (name: string, relationship?: LocalizedText) => {
    const key = name.trim();
    if (!key) return;
    const existing = byName.get(key.toLowerCase());
    const aliases = new Set([
      ...(existing?.aliases ?? []),
      ...relationshipAliases(relationship),
    ]);
    byName.set(key.toLowerCase(), { name: existing?.name ?? key, aliases: [...aliases] });
  };

  for (const topic of policy?.topics ?? []) add(topic.subjectName, topic.relationship);
  for (const photo of data.photos) add(photo.name, photo.relationship);
  for (const entry of data.entries) if (entry.visitorName) add(entry.visitorName);

  return [...byName.values()];
}
