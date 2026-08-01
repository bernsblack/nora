import type { RoomData } from "./room-view";
import type { AnswerPolicy, FamilyNote, ScheduleEntry } from "./types";

/**
 * The room device is handed its whole day at once and then derives everything
 * locally. That is what makes mode one work with no network, and it is why the
 * data crosses the server boundary as plain JSON rather than being re-fetched
 * on every tick.
 */

export interface SerializedRoomData {
  person: RoomData["person"];
  facility: RoomData["facility"];
  entries: (Omit<ScheduleEntry, "startsAt" | "endsAt"> & {
    startsAt: string;
    endsAt?: string;
  })[];
  notes: (Omit<FamilyNote, "createdAt" | "expiresAt"> & {
    createdAt: string;
    expiresAt?: string;
  })[];
  photos: RoomData["photos"];
}

export function serializeRoomData(data: RoomData): SerializedRoomData {
  return {
    person: data.person,
    facility: data.facility,
    entries: data.entries.map((entry) => ({
      ...entry,
      startsAt: entry.startsAt.toISOString(),
      endsAt: entry.endsAt?.toISOString(),
    })),
    notes: data.notes.map((note) => ({
      ...note,
      createdAt: note.createdAt.toISOString(),
      expiresAt: note.expiresAt?.toISOString(),
    })),
    photos: data.photos,
  };
}

export function deserializeRoomData(data: SerializedRoomData): RoomData {
  return {
    person: data.person,
    facility: data.facility,
    entries: data.entries.map((entry) => ({
      ...entry,
      startsAt: new Date(entry.startsAt),
      endsAt: entry.endsAt ? new Date(entry.endsAt) : undefined,
    })),
    notes: data.notes.map((note) => ({
      ...note,
      createdAt: new Date(note.createdAt),
      expiresAt: note.expiresAt ? new Date(note.expiresAt) : undefined,
    })),
    photos: data.photos,
  };
}

/** The answer policy carries no dates, so it crosses as itself. */
export type SerializedAnswerPolicy = AnswerPolicy;
