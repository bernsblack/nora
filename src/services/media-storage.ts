/**
 * Where family uploaded photos and recorded voice messages live. Mocked,
 * because object storage is a bought service and none is provisioned.
 *
 * Nothing captured in the room ever reaches this. It is one directional: the
 * family app writes, the room screen reads.
 */

export interface StoredMedia {
  url: string;
  contentType: string;
  bytes: number;
}

export interface MediaStore {
  put(fileName: string, contentType: string, data: ArrayBuffer): Promise<StoredMedia>;
  remove(url: string): Promise<void>;
}

/**
 * Keeps uploads in process memory as data URLs. Good enough to prove the family
 * app flow, and it loses everything on restart, which is the right kind of
 * obviously temporary.
 */
export class InMemoryMediaStore implements MediaStore {
  private items = new Map<string, StoredMedia>();

  async put(fileName: string, contentType: string, data: ArrayBuffer): Promise<StoredMedia> {
    const base64 = Buffer.from(data).toString("base64");
    const stored: StoredMedia = {
      url: `data:${contentType};base64,${base64}`,
      contentType,
      bytes: data.byteLength,
    };
    this.items.set(fileName, stored);
    return stored;
  }

  async remove(fileName: string): Promise<void> {
    this.items.delete(fileName);
  }
}

let cached: MediaStore | null = null;

export function getMediaStore(): MediaStore {
  cached ??= new InMemoryMediaStore();
  return cached;
}
