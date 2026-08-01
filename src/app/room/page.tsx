import { getRepository } from "@/data";
import { FIXTURE_DEVICE_TOKEN } from "@/data/fixtures";
import { serializeRoomData } from "@/domain/serialize";
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
  searchParams: Promise<{ token?: string; wizard?: string }>;
}

export default async function RoomPage({ searchParams }: RoomPageProps) {
  const { token = FIXTURE_DEVICE_TOKEN, wizard } = await searchParams;
  const repository = getRepository();
  const now = new Date();

  const device = await repository.resolveDeviceToken(token);
  if (!device) return <RoomFallback reason="unknown-device" />;

  await repository.touchDeviceToken(token, now);

  const data = await repository.loadRoomData(device.personId, now);
  if (!data) return <RoomFallback reason="no-data" />;

  const policy = await repository.getAnswerPolicy(device.personId);

  return (
    <RoomScreen
      data={serializeRoomData(data)}
      policy={policy}
      serverNow={now.toISOString()}
      wizard={wizard === "1"}
    />
  );
}

/**
 * There is no error state on this screen, only a quieter one. Whatever has gone
 * wrong is ours, and the person in the room cannot act on it, so they are not
 * told about it. A member of staff who looks closely sees a small marker.
 */
function RoomFallback({ reason }: { reason: string }) {
  return (
    <div className={`${styles.room} ${styles.fallback}`} data-reason={reason}>
      <div className={styles.fallbackMark} aria-hidden="true" />
    </div>
  );
}
