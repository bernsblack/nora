"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ROOM_TICK_MS } from "@/config/constants";
import { resolveLighting } from "@/domain/lighting";
import { buildRoomView } from "@/domain/room-view";
import { deserializeRoomData, type SerializedRoomData } from "@/domain/serialize";
import { zonedParts } from "@/domain/time";
import type { AnswerPolicy } from "@/domain/types";
import { phrases } from "@/i18n/strings";
import { roomThemeCss } from "@/design/room-theme";
import { UnmeasuredAmbientLight, type AmbientLightSource } from "@/services/ambient-light";
import styles from "./room.module.css";
import { useVoice } from "./use-voice";

/**
 * The room screen. Four things and nothing else: the day, where they are, the
 * one next thing, and a face with a name under it.
 *
 * The whole day is handed over once and every tick derives from it locally, so
 * the screen keeps working when the network does not.
 */

interface RoomScreenProps {
  data: SerializedRoomData;
  policy: AnswerPolicy | null;
  serverNow: string;
  /**
   * The Wizard of Oz control. PROJECT.md section 14 says to test whether an
   * answering device is comforting or unsettling with a human listening before
   * writing any intent matching, so the operator needs a way to be the ears.
   */
  wizard?: boolean;
  /** Tests inject a fixed clock and a fixed lux reading through these. */
  clock?: () => Date;
  light?: AmbientLightSource;
}

export function RoomScreen({ data, policy, serverNow, wizard, clock, light }: RoomScreenProps) {
  const roomData = useMemo(() => deserializeRoomData(data), [data]);
  const now = useCallback(() => (clock ? clock() : new Date()), [clock]);

  // Starts on the server's clock so the first paint matches the server render,
  // then follows the device from the first tick onward. If the two clocks
  // disagree the screen is briefly on the server's, which is corrected within
  // one tick and matters far less than the facility timezone does.
  const [tick, setTick] = useState(() => new Date(serverNow));
  useEffect(() => {
    const timer = setInterval(() => setTick(now()), ROOM_TICK_MS);
    return () => clearInterval(timer);
  }, [now]);

  const ambient = useMemo(() => light ?? new UnmeasuredAmbientLight(), [light]);
  useEffect(() => ambient.start(), [ambient]);

  const view = useMemo(() => buildRoomView(roomData, tick), [roomData, tick]);
  const text = phrases(view.language);

  const lighting = useMemo(() => {
    const { hour } = zonedParts(tick, roomData.facility.timezone);
    return resolveLighting(ambient.read().lux, hour);
  }, [ambient, tick, roomData.facility.timezone]);

  const voice = useVoice({
    data: roomData,
    policy,
    enabled: view.capabilities.listenLocally && roomData.person.micEnabled,
    now,
  });

  // What the voice layer just answered takes the next thing slot, because two
  // answers on one screen is one too many.
  const spoken = voice.state.kind === "answering" ? voice.state.text : null;

  return (
    <div
      className={styles.room}
      /* The theme's custom properties hang off this, see ROOM_THEME_SELECTOR. */
      data-room=""
      data-lighting={lighting.mode}
      data-language={view.language}
      data-testid="room"
    >
      <style dangerouslySetInnerHTML={{ __html: roomThemeCss(lighting.palette, lighting.inkDim) }} />

      <p className={styles.day} data-testid="day">
        {view.dayAndPartOfDay}
      </p>

      <div className={styles.column}>
        {view.location ? (
          <p className={styles.location} data-testid="location">
            {view.location}
          </p>
        ) : null}

        {spoken ? (
          <p className={styles.next} data-testid="spoken" data-rule={voice.state.kind === "answering" ? voice.state.rule : undefined}>
            {spoken}
          </p>
        ) : view.nextThing ? (
          <p className={styles.next} data-testid="next-thing">
            {view.nextThing}
          </p>
        ) : null}

        {voice.state.kind === "addressed" ? (
          <p className={styles.location} data-testid="addressed">
            {text.didNotCatch}
          </p>
        ) : null}
      </div>

      {view.photo ? (
        <figure className={styles.photoFrame} data-testid="photo">
          {/*
            A plain img rather than next/image. The room device has to render
            with no network, so the optimiser buys nothing here, and family
            uploads will come from wherever storage ends up rather than from a
            fixed allowlist of hosts.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={view.photo.url}
            className={styles.photo}
            src={view.photo.url}
            /* Decorative to a screen reader: the name below carries the meaning. */
            alt=""
          />
          <figcaption className={styles.caption} data-testid="photo-caption">
            {view.photo.caption}
          </figcaption>
        </figure>
      ) : null}

      <p
        className={styles.mic}
        data-testid="mic-state"
        data-transmitting={voice.transmitsAudio ? "true" : "false"}
      >
        {voice.state.kind === "off" ? text.micOff : text.micOn}
      </p>

      {wizard ? <WizardControl onSay={voice.say} /> : null}
    </div>
  );
}

/**
 * A human types what they heard the person in the room say, and the device
 * answers as if it had understood. This is how the interaction gets tested
 * before any of the recognition is trusted, and it is also what drives the
 * browser tests.
 */
function WizardControl({ onSay }: { onSay: (text: string) => void }) {
  const [value, setValue] = useState("");

  const send = () => {
    const said = value.trim();
    if (!said) return;
    onSay(said);
    setValue("");
  };

  return (
    <div className={styles.wizard}>
      <input
        className={styles.wizardInput}
        data-testid="wizard-input"
        value={value}
        placeholder="What did they say?"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") send();
        }}
      />
      <button className={styles.wizardButton} data-testid="wizard-send" onClick={send}>
        Say
      </button>
    </div>
  );
}
