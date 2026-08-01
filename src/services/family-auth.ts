import "server-only";

/**
 * Family app authentication. Mocked, because auth is a bought service and the
 * provider is not chosen. The room device never touches this: it authenticates
 * with a long lived device token and has no login (PROJECT.md section 9).
 *
 * The real implementation has to answer one question this mock does not: which
 * family member is allowed to change the answer policy. That is the setting
 * that decides what a person believes about whether their husband is alive, and
 * it should not be editable by whoever happens to have the app installed.
 */

export interface FamilyUser {
  id: string;
  name: string;
  email: string;
  /** People this user may read and write. */
  personIds: string[];
}

export interface FamilyAuth {
  currentUser(): Promise<FamilyUser | null>;
  canAccess(personId: string): Promise<boolean>;
}

export class MockFamilyAuth implements FamilyAuth {
  constructor(private user: FamilyUser) {}

  async currentUser(): Promise<FamilyUser | null> {
    return this.user;
  }

  async canAccess(personId: string): Promise<boolean> {
    return this.user.personIds.includes(personId);
  }
}

import { FIXTURE_PERSON_ID } from "@/data/fixtures";

export const FIXTURE_FAMILY_USER: FamilyUser = {
  id: "family-anna",
  name: "Anna",
  email: "anna@example.com",
  personIds: [FIXTURE_PERSON_ID],
};

let cached: FamilyAuth | null = null;

export function getFamilyAuth(): FamilyAuth {
  cached ??= new MockFamilyAuth(FIXTURE_FAMILY_USER);
  return cached;
}
