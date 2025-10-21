// client/src/app/ai/findTaskLocation.ts
const VERCEL_BASE = "https://g-remind-backend.vercel.app";

export interface TaskLocation {
  name: string;
  lat: number;
  lng: number;
  eta?: string;
  description?: string;
}

function normalizeServerLocation(it: any): TaskLocation | null {
  if (!it) return null;

  const name = it.name ?? it.title ?? it.place_name ?? it.label ?? "Unknown";
  const lat = it.lat ?? it.latitude ?? (it.geometry?.lat) ?? (it.location?.lat) ?? null;
  const lng = it.lng ?? it.longitude ?? (it.geometry?.lng) ?? (it.location?.lng) ?? null;

  if (lat == null || lng == null) return null;

  return {
    name: String(name),
    lat: Number(lat),
    lng: Number(lng),
    description: it.description ?? it.vicinity ?? it.address ?? null,
    eta: it.eta ?? null,
  };
}

export async function findTaskLocation(
  task: string,
  userLocation?: string
): Promise<TaskLocation[]> {
  try {
    const body = { userInput: task, userLocation };
    console.log("[findTaskLocation] calling backend with:", body);

    const r = await fetch(`${VERCEL_BASE}/api/find-task-location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const j = await r.json().catch(async (e) => {
      console.warn("[findTaskLocation] json parse failed", e);
      console.warn("[findTaskLocation] response text:", await r.text());
      return null;
    });

    // Normalize response to always handle array
    let raw: any[] = [];
    if (Array.isArray(j?.data)) raw = j.data;
    else if (j?.data && typeof j.data === "object") raw = [j.data];
    else if (j && typeof j === "object") raw = [j];
    else raw = [];

    const normalized = raw
      .map(normalizeServerLocation)
      .filter((e: TaskLocation | null): e is TaskLocation => e !== null);

    return normalized;
  } catch (e) {
    console.error("[findTaskLocation] fetch error:", e);
    return [];
  }
}
