/**
 * Ambient light, behind an interface because the real source depends on
 * hardware we have not chosen yet. The web sensor exists in the spec and almost
 * nowhere in practice, so the null reading is the expected case and callers
 * fall back to the clock (see domain/lighting.ts).
 */

export interface AmbientLightReading {
  /** Illuminance in lux, or null when nothing can measure it. */
  lux: number | null;
}

export interface AmbientLightSource {
  /** Latest reading. Cheap and synchronous, callers poll it on the room tick. */
  read(): AmbientLightReading;
  /** Begin sampling. Safe to call twice. Returns a stop function. */
  start(): () => void;
}

/** What we get on a tablet with no sensor, which is most of them. */
export class UnmeasuredAmbientLight implements AmbientLightSource {
  read(): AmbientLightReading {
    return { lux: null };
  }
  start(): () => void {
    return () => {};
  }
}

/** Fixed value, for tests and for the family app's room screen preview. */
export class MockAmbientLight implements AmbientLightSource {
  constructor(private lux: number | null) {}
  set(lux: number | null): void {
    this.lux = lux;
  }
  read(): AmbientLightReading {
    return { lux: this.lux };
  }
  start(): () => void {
    return () => {};
  }
}

interface AmbientLightSensorLike {
  illuminance: number;
  addEventListener(type: "reading" | "error", listener: () => void): void;
  start(): void;
  stop(): void;
}

type AmbientLightSensorConstructor = new (options: {
  frequency: number;
}) => AmbientLightSensorLike;

/** Hz. One reading a second is plenty for a decision that changes twice a day. */
const SENSOR_FREQUENCY_HZ = 1;

/**
 * Chromium behind a permission and a flag, on hardware that has the sensor.
 * Degrades to null rather than throwing, so the caller's clock fallback runs.
 */
export class BrowserAmbientLight implements AmbientLightSource {
  private lux: number | null = null;
  private sensor: AmbientLightSensorLike | null = null;

  read(): AmbientLightReading {
    return { lux: this.lux };
  }

  start(): () => void {
    const Sensor = (globalThis as { AmbientLightSensor?: AmbientLightSensorConstructor })
      .AmbientLightSensor;
    if (!Sensor) return () => {};

    try {
      const sensor = new Sensor({ frequency: SENSOR_FREQUENCY_HZ });
      sensor.addEventListener("reading", () => {
        this.lux = sensor.illuminance;
      });
      sensor.addEventListener("error", () => {
        this.lux = null;
      });
      sensor.start();
      this.sensor = sensor;
    } catch {
      this.lux = null;
      return () => {};
    }

    return () => {
      this.sensor?.stop();
      this.sensor = null;
      this.lux = null;
    };
  }
}
