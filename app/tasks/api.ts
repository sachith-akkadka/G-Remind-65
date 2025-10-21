// api.ts

// Detect base URL depending on platform & environment
function getApiBase() {
  // Optional: allow override via env during dev
  const envBase = process.env.EXPO_PUBLIC_API_BASE;
  if (envBase) {
    return envBase.endsWith("/api") ? envBase : `${envBase}/api`;
  }

  // Default to hosted HTTPS backend to avoid emulator/device networking issues
  return "https://g-remind-backend.vercel.app/api";
}

const API_BASE = getApiBase();

async function request<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${path} failed: ${errText}`);
  }
  return res.json();
}

// -----------------------------
// Suggest task titles (AI autocomplete for "pick up...")
// -----------------------------
export async function suggestTaskTitles(partialTitle: string): Promise<string[]> {
  const body = { userInput: partialTitle };
  const result = await request<{ success: boolean; data?: string[] }>("/suggest-tasks", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result.data || [];
}

// -----------------------------
// Suggest locations for a given task title (autocomplete / smart suggestions)
// -----------------------------
export async function suggestLocations(
  taskTitle: string,
  userLocation?: string
): Promise<{ name: string; lat?: number; lng?: number }[]> {
  const body = { userInput: taskTitle, userLocation };
  const result = await request<{ success: boolean; data?: { name: string; lat: number; lng: number }[] }>(
    "/suggest-locations",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
  return result.data || [];
}

// -----------------------------
// Find a location automatically if user didn’t set one
// -----------------------------
export async function findTaskLocation(
  taskTitle: string,
  userLocation?: string
): Promise<{ name?: string; lat?: number; lng?: number } | null> {
  const body = { userInput: taskTitle, userLocation };
  const result = await request<{ success: boolean; data?: { name?: string; lat?: number; lng?: number } }>(
    "/find-task-location",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
  return result.data || null;
}

// -----------------------------
// Suggest category for new task
// -----------------------------
export async function suggestCategory(
  taskTitle: string,
  pastCategories?: string[]
): Promise<string | null> {
  const body = { taskTitle, pastCategories };
  const result = await request<{ success: boolean; data?: string }>("/suggest-task-category", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result.data || null;
}

// -----------------------------
// Suggest reschedule time for missed tasks
// -----------------------------
export async function suggestRescheduleTime(
  taskTitle: string,
  originalDueDate: string
): Promise<{ suggestedRescheduleTime?: string; reasoning?: string } | null> {
  const body = { taskTitle, originalDueDate };
  const result = await request<{ success: boolean; data?: { suggestedRescheduleTime?: string; reasoning?: string } }>(
    "/suggest-reschedule-time",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
  return result.data || null;
}
