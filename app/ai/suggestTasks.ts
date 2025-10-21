const VERCEL_BASE = "https://g-remind-backend.vercel.app";

export async function suggestTasks(userInput: string): Promise<string[]> {
  try {
    const r = await fetch(`${VERCEL_BASE}/api/suggest-tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userInput }),
    });
    const j = await r.json();
    return Array.isArray(j?.data) ? j.data : [];
  } catch (e) {
    console.error("suggestTasks error:", e);
    return [];
  }
}
