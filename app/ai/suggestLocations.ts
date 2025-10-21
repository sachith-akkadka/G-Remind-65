// client/src/app/ai/suggestLocations.ts
const VERCEL_BASE = "https://g-remind-backend.vercel.app";

export interface SuggestedLocation {
  name: string;
  lat: number;
  lng: number;
  description?: string;
  eta?: string;
  city?: string;
  address?: string;
}

function normalizeServerLocation(it: any): SuggestedLocation | null {
  if (!it) return null;
  const name = it.name ?? it.title ?? it.place_name ?? it.label ?? "Unknown";
  const lat = it.lat ?? it.latitude ?? (it.geometry && it.geometry.lat) ?? (it.location && it.location.lat) ?? null;
  const lng = it.lng ?? it.longitude ?? (it.geometry && it.geometry.lng) ?? (it.location && it.location.lng) ?? null;
  if (lat == null || lng == null) return null;

  // Try to get city/locality from server object
  const city = it.city ?? it.locality ?? it.town ?? it.vicinity ?? it.context?.city ?? it.context?.place ?? undefined;

  return {
    name: String(name),
    lat: Number(lat),
    lng: Number(lng),
    description: it.description ?? it.vicinity ?? it.address ?? null,
    eta: it.eta ?? null,
    // add city to type if you want; otherwise embed in description
    // @ts-ignore
    city: String(city) ?? null,
    address: it.address ?? it.formatted_address ?? null,
  };
}


export async function suggestLocations(
  task: string,
  userLocation?: string
): Promise<SuggestedLocation[]> {
  try {
    // send the key backend expects
    const body = { userInput: task, userLocation };
       console.log("[suggestLocations] calling backend with:", body);
    const r = await fetch(`${VERCEL_BASE}/api/suggest-locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    console.log("[suggestLocations] body:::::", body);
    console.log("[suggestLocations] status", r.status);
    const j = await r.json().catch((e) => {
      console.warn("[suggestLocations] json parse failed", e);
      return null;
    });

    console.log("[suggestLocations] body:", j);

    // backend returns { success: true, data: [...] } per your server
    const raw = Array.isArray(j?.data) ? j.data : Array.isArray(j?.locations) ? j.locations : Array.isArray(j) ? j : [];
    const normalized = raw
      .map(normalizeServerLocation)
      .filter((e: SuggestedLocation | null): e is SuggestedLocation => e !== null)
      .slice(0, 10);

    return normalized;
  } catch (e) {
    console.error("suggestLocations error:", e);
    return [];
  }
}
