import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    const response = await fetch("http://api.open-notify.org/iss-now.json", {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch ISS telemetry from upstream API" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error proxying ISS telemetry:", error);
    return NextResponse.json(
      { error: "Failed to fetch ISS telemetry from upstream API" },
      { status: 502 }
    );
  }
}
