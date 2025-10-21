const VERCEL_BASE = "https://g-remind-backend.vercel.app";

export async function suggestTaskCategory(taskTitle: string): Promise<string> {
  try {
    const r = await fetch(`${VERCEL_BASE}/api/suggest-task-category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskTitle }),
    });
    const j = await r.json();
    return typeof j?.data === "string" ? j.data : "Other";
  } catch (e) {
    console.error("suggestTaskCategory error:", e);
    return "Other";
  }
}
