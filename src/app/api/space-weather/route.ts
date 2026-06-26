import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export interface SpaceWeatherEvent {
  id: string;
  kind: "flare" | "cme" | "storm";
  time: string;
  headline: string;
  plainEnglish: string;
  severity: "low" | "moderate" | "high";
}

/** Maps a solar flare class letter (X, M, C, B, A) to a 0-100-ish severity bucket. */
function flareSeverity(classType: string | null | undefined): SpaceWeatherEvent["severity"] {
  const letter = (classType ?? "").charAt(0).toUpperCase();
  if (letter === "X") return "high";
  if (letter === "M") return "moderate";
  return "low";
}

function kpSeverity(kp: number): SpaceWeatherEvent["severity"] {
  if (kp >= 6) return "high";
  if (kp >= 4) return "moderate";
  return "low";
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";
  const days = req.nextUrl.searchParams.get("days") ?? "7";

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - Number(days) * 86400_000).toISOString().slice(0, 10);

  const urls = {
    flares: `https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`,
    cme: `https://api.nasa.gov/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`,
    gst: `https://api.nasa.gov/DONKI/GST?startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`,
  };

  try {
    const [flrRes, cmeRes, gstRes] = await Promise.all([
      fetch(urls.flares, { cache: "no-store" }),
      fetch(urls.cme, { cache: "no-store" }),
      fetch(urls.gst, { cache: "no-store" }),
    ]);

    const events: SpaceWeatherEvent[] = [];

    if (flrRes.ok) {
      const flares = (await flrRes.json()) as Array<{
        flrID: string; beginTime: string; classType: string; sourceLocation?: string;
      }>;
      for (const f of flares.slice(-10)) {
        events.push({
          id: f.flrID,
          kind: "flare",
          time: f.beginTime,
          headline: `Solar flare — class ${f.classType || "?"}`,
          plainEnglish:
            flareSeverity(f.classType) === "high"
              ? "A major flare. Can briefly disrupt radio communication and GPS on the sunlit side of Earth."
              : flareSeverity(f.classType) === "moderate"
              ? "A moderate flare. Minor radio blackouts possible at high latitudes."
              : "A minor flare. Little to no effect on observing conditions.",
          severity: flareSeverity(f.classType),
        });
      }
    }

    if (cmeRes.ok) {
      const cmes = (await cmeRes.json()) as Array<{
        activityID: string; startTime: string;
        cmeAnalyses?: Array<{ speed?: number; isMostAccurate?: boolean }>;
      }>;
      for (const c of cmes.slice(-6)) {
        const speed = c.cmeAnalyses?.find((a) => a.isMostAccurate)?.speed ?? c.cmeAnalyses?.[0]?.speed;
        events.push({
          id: c.activityID,
          kind: "cme",
          time: c.startTime,
          headline: `Coronal mass ejection${speed ? ` — ${Math.round(speed)} km/s` : ""}`,
          plainEnglish:
            speed && speed > 1000
              ? "A fast eruption of solar plasma. If Earth-directed, could trigger aurorae and minor satellite drag in the next 1-3 days."
              : "A slower plasma eruption from the Sun. Low risk to Earth's magnetic field.",
          severity: speed && speed > 1000 ? "moderate" : "low",
        });
      }
    }

    if (gstRes.ok) {
      const storms = (await gstRes.json()) as Array<{
        gstID: string; startTime: string;
        allKpIndex?: Array<{ kpIndex: number }>;
      }>;
      for (const s of storms.slice(-6)) {
        const maxKp = Math.max(0, ...(s.allKpIndex?.map((k) => k.kpIndex) ?? [0]));
        events.push({
          id: s.gstID,
          kind: "storm",
          time: s.startTime,
          headline: `Geomagnetic storm — Kp ${maxKp.toFixed(1)}`,
          plainEnglish:
            kpSeverity(maxKp) === "high"
              ? "A strong geomagnetic storm. Aurorae may be visible at unusually low latitudes; possible satellite/GPS disruption."
              : kpSeverity(maxKp) === "moderate"
              ? "A moderate storm. Aurorae possible at high latitudes; minor effects on satellite operations."
              : "A mild disturbance in Earth's magnetic field. Unlikely to be noticeable.",
          severity: kpSeverity(maxKp),
        });
      }
    }

    events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({
      events: events.slice(0, 12),
      usingDemoKey: apiKey === "DEMO_KEY",
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Space weather data temporarily unavailable." }, { status: 503 });
  }
}
