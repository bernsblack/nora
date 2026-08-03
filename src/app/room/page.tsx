import { getRepository, usingDatabase } from "@/data";
import { NIGHT_PALETTE } from "@/design/room-theme";
import { serializeRoomData } from "@/domain/serialize";
import { deviceTokenFor, lightingOverrideAllowed } from "./device-token";
import { RegisterServiceWorker } from "./register-service-worker";
import { RoomScreen } from "./room-screen";
import styles from "./room.module.css";

/**
 * The room screen route. Always on, no lock screen, no navigation, no way to
 * reach a broken state (PROJECT.md section 1).
 *
 * Authentication is a long lived device token, never a login. The token arrives
 * as a query parameter because a kiosk browser is pointed at one URL once and
 * then left alone for months.
 */

export const dynamic = "force-dynamic";

interface RoomPageProps {
  // Next supplies string | string[]: a URL may repeat a parameter. Typing these
  // as plain strings let `?token=a&token=b` reach `.trim()` and throw, which
  // renders the framework's error page on a screen whose rule is that no broken
  // state is reachable.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** First value only. A repeated parameter is a malformed URL, not two answers. */
function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RoomPage({ searchParams }: RoomPageProps) {
  const params = await searchParams;
  const token = one(params.token);
  const wizard = one(params.wizard);
  const lux = one(params.lux);
  const onFixtures = !usingDatabase();

  const deviceToken = deviceTokenFor(token, onFixtures);
  if (!deviceToken) return <RoomFallback reason="unknown-device" />;

  const pretendLux =
    lux === undefined || !lightingOverrideAllowed(onFixtures) ? undefined : Number(lux);
  const repository = getRepository();
  const now = new Date();

  const device = await repository.resolveDeviceToken(deviceToken);
  if (!device) return <RoomFallback reason="unknown-device" />;

  await repository.touchDeviceToken(deviceToken, now);

  const data = await repository.loadRoomData(device.personId, now);
  if (!data) return <RoomFallback reason="no-data" />;

  const policy = await repository.getAnswerPolicy(device.personId);

  return (
    <>
      <RoomScreen
        data={serializeRoomData(data)}
        policy={policy}
        serverNow={now.toISOString()}
        wizard={wizard === "1"}
        pretendLux={pretendLux !== undefined && Number.isFinite(pretendLux) ? pretendLux : undefined}
      />
      <RegisterServiceWorker />
    </>
  );
}

/**
 * There is no error state on this screen, only a quieter one. Whatever has gone
 * wrong is ours, and the person in the room cannot act on it, so they are not
 * told about it. A member of staff who looks closely sees a small marker.
 */
function RoomFallback({ reason }: { reason: string }) {
  // The night palette regardless of the hour. Whatever has gone wrong, this
  // screen may be showing at three in the morning, and a bright rectangle in a
  // dark bedroom causes the disorientation MIN_INK_DIM and NIGHT_LUX_THRESHOLD
  // exist to prevent. Dark by day reads as a device that is off, which is both
  // unremarkable and true.
  return (
    <div
      className={`${styles.room} ${styles.fallback}`}
      data-reason={reason}
      style={{ background: NIGHT_PALETTE.surface }}
    >
      <div
        className={styles.fallbackMark}
        style={{ background: NIGHT_PALETTE.inkSoft }}
        aria-hidden="true"
      />
    </div>
  );
}
