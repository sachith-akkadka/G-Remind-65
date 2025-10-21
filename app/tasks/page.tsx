// app/tasks/page.tsx
import { isToday, parseISO } from "date-fns";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

// Components & hooks (paths assume components live in /components/tasks and /components)
import MapNavigationModal from "@/components/MapNavigationModal";
import NewTaskSheet from "@/components/NewTaskSheet";
import { Task as NewTaskType } from "@/lib/types";
import { findTaskLocation, suggestRescheduleTime } from "./api";
import FilterDropdown from "./FilterDropdown";
import TaskCard from "./TaskCard";
import { useGeofencing } from "./useGeofencing";
import useNotifications from "./UseNotifications";

// -----------------------------
// Types
// -----------------------------
export type Task = NewTaskType;

// -----------------------------
// Utility: haversine distance (meters) - used only if required locally
// -----------------------------
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// -----------------------------
// Main screen
// -----------------------------
export default function TasksPage() {
  // Core task list
  const [tasks, setTasks] = useState<Task[]>([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"today" | "tomorrow" | "pending">("today");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isMapVisible, setIsMapVisible] = useState(false);

  const [plannedRoute, setPlannedRoute] = useState<{ lat: number; lng: number; name: string }[]>([]);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  // Categories & filters
  const [categories, setCategories] = useState<string[]>(["Uncategorized", "Work", "Personal", "Auto"]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);

  // user location (lat,lng)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // notification helper hook
  const { scheduleReminder, cancelReminder } = useNotifications({
    onTaskReminderTap: (taskId) => {
      // handle when user taps a time-based notification (open/edit maybe)
      const t = tasks.find((x) => x.id === taskId);
      if (t) {
        // bring up sheet to edit or mark done
        setEditingTask(t);
        setIsSheetOpen(true);
      }
    },
  });

  // geofencing hook: watches proximity and triggers notifications
  useGeofencing(tasks);

  // location watch sub (used also for route planning origin)
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Location permission denied");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });

        // watch position to keep current location fresh (low accuracy)
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Low, distanceInterval: 30, timeInterval: 5000 },
          (p) => {
            setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
          }
        );
      } catch (err) {
        console.error("Location watch failed", err);
      }
    })();

    return () => {
      sub?.remove();
    };
  }, []);

  // --------------------------------------------
  // Derived lists and filtering
  // --------------------------------------------
  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      if (filterCategories.length > 0 && !filterCategories.includes(task.category)) return false;
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        (task.storeName || "").toLowerCase().includes(q) ||
        (task.store || "").toLowerCase().includes(q)
      );
    });
  }, [tasks, searchQuery, filterCategories]);

  const todayTasks = filteredTasks.filter((t) => {
    try {
      const d = parseISO(t.dueDate);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    } catch {
      return false;
    }
  });

  const tomorrowTasks = filteredTasks.filter((t) => {
    try {
      const d = parseISO(t.dueDate);
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      return d.getFullYear() === tom.getFullYear() && d.getMonth() === tom.getMonth() && d.getDate() === tom.getDate();
    } catch {
      return false;
    }
  });

  const pendingTasks = filteredTasks.filter((t) => {
    try {
      const d = parseISO(t.dueDate);
      const now = new Date();
      const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      const isTomorrow = d.getFullYear() === tom.getFullYear() && d.getMonth() === tom.getMonth() && d.getDate() === tom.getDate();
      return !isToday && !isTomorrow;
    } catch {
      return true;
    }
  });

  const tasksForActiveTab = activeTab === "today" ? todayTasks : activeTab === "tomorrow" ? tomorrowTasks : pendingTasks;

  // --------------------------------------------
  // CRUD & helpers
  // --------------------------------------------
  function openNewTaskSheetForCreate() {
    setEditingTask(null);
    setIsSheetOpen(true);
  }

  function openNewTaskSheetForEdit(task: Task) {
    setEditingTask(task);
    setIsSheetOpen(true);
  }

  function upsertTaskFromSheet(saved: any) {
    // saved is whatever your NewTaskSheet posts back from backend; normalize
    const t: Task = {
      id: saved.id || String(Date.now()),
      title: saved.title,
      description: saved.description,
      dueDate: saved.dueDate || new Date().toISOString(),
      store: saved.store,
      storeName: saved.storeName,
      status: (saved.status as any) || "pending",
      category: saved.category || "Uncategorized",
      priority: saved.priority || "medium",
      recurring: saved.recurring,
      userId: saved.userId || "unknown",
    };
    setTasks((prev) => {
      const found = prev.find((p) => p.id === t.id);
      if (found) return prev.map((p) => (p.id === t.id ? t : p));
      return [t, ...prev];
    });

    // schedule reminder via hook
    scheduleReminder(t, 10).catch(() => {});
  }

  function removeTask(id: string) {
    cancelReminder(id).catch(() => {});
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function markTaskCompleted(id: string) {
    cancelReminder(id).catch(() => {});
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "completed" } : t)));
  }

  // --------------------------------------------
  // Reschedule via AI
  // --------------------------------------------
  async function handleReschedule(task: Task) {
    try {
      const resp = await suggestRescheduleTime(task.title, task.dueDate);
      if (!resp || !resp.suggestedRescheduleTime) {
        Alert.alert("No suggestion", "AI could not find a new time.");
        return;
      }
      const newDue = new Date(resp.suggestedRescheduleTime);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, dueDateISO: newDue.toISOString(), status: isToday(newDue) ? "today" : "pending" } : t)));
      Alert.alert("Rescheduled", `New time: ${newDue.toLocaleString()}\nReason: ${resp.reasoning || "AI suggestion"}`);
      // reschedule notification
      scheduleReminder({ ...task, dueDate: newDue.toISOString() }, 10).catch(() => {});
    } catch (err) {
      console.error("reschedule error", err);
      Alert.alert("Reschedule Failed", "AI reschedule failed.");
    }
  }

  // --------------------------------------------
  // Single-task navigation (open in-app MapNavigationModal). If no location, call backend findTaskLocation.
  // --------------------------------------------
  async function startNavigationToTask(task: Task) {
    try {
      let dest = task.store;
      let destName = task.storeName || task.title;

      if (!dest) {
        // ask backend to find a location
        const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : undefined;
        const found = await findTaskLocation(task.title, origin).catch(() => null);
        if (found && found.lat != null && found.lng != null) {
          dest = `${found.lat},${found.lng}`;
          destName = found.name || destName;
          // update local task
          setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, store: dest, storeName: destName } : t)));
        } else {
          Alert.alert("No location found", "Could not automatically find a place for this task.");
          return;
        }
      }

      // parse lat,lng from dest (expected as "lat,lng")
      if (typeof dest === "string" && dest.includes(",")) {
        const [latStr, lngStr] = dest.split(",");
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (!isNaN(lat) && !isNaN(lng)) {
          setPlannedRoute([{ lat, lng, name: destName }]);
          setActiveTask(task);
          setIsMapVisible(true);
          return;
        }
      }

      // If dest is not lat,lng string, fallback: try to resolve via findTaskLocation again (without origin)
      const foundFallback = await findTaskLocation(task.title, undefined).catch(() => null);
      if (foundFallback && foundFallback.lat != null && foundFallback.lng != null) {
        const lat = foundFallback.lat;
        const lng = foundFallback.lng;
        setPlannedRoute([{ lat, lng, name: foundFallback.name || destName }]);
        setActiveTask(task);
        setIsMapVisible(true);
        // update stored task location as string for future runs
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, store: `${lat},${lng}`, storeName: foundFallback.name || destName } : t)));
        return;
      }

      Alert.alert("Navigation Error", "Could not determine destination coordinates.");
    } catch (err) {
      console.error("startNavigationToTask error", err);
      Alert.alert("Navigation Error", "Could not start navigation.");
    }
  }

  // --------------------------------------------
  // Multi-stop route planning for active tab
  // Build list of {lat, lng, name} for each actionable task, resolving missing ones via findTaskLocation.
  // Then open MapNavigationModal with plannedRoute.
  // --------------------------------------------
  async function handleStartMultiStopNavigation() {
    // build list of actionable tasks from active tab
    const actionable = tasksForActiveTab.filter((t) => t.status !== "completed");
    if (actionable.length === 0) {
      Alert.alert("No tasks", "No tasks to navigate for the current tab.");
      return;
    }

    // Origin string used when asking backend to resolve addresses
    const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : undefined;

    try {
      // Resolve all tasks into { lat, lng, name } - use existing store if lat,lng string; otherwise try findTaskLocation
      const resolved = await Promise.all(
        actionable.map(async (t) => {
          if (t.store && typeof t.store === "string" && t.store.includes(",")) {
            const [latStr, lngStr] = t.store.split(",");
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng, name: t.storeName || t.title };
          }
          // otherwise try to resolve from backend
          try {
            const found = await findTaskLocation(t.title, origin).catch(() => null);
            if (found && found.lat != null && found.lng != null) {
              // update local task store so next time it's immediate
              setTasks((prev) => prev.map((p) => (p.id === t.id ? { ...p, store: `${found.lat},${found.lng}`, storeName: found.name || p.storeName } : p)));
              return { lat: found.lat, lng: found.lng, name: found.name || t.title };
            }
          } catch (e) {
            console.warn("resolve task location failed for", t.title, e);
          }
          return null;
        })
      );

      // filter out unresolved entries
      const points = resolved.filter((p): p is { lat: number; lng: number; name: string } => p !== null);

      if (points.length === 0) {
        Alert.alert("No locations", "Could not resolve locations for any tasks. Pick locations manually or allow location permissions.");
        return;
      }

      // set planned route and open modal - MapNavigationModal will request Directions API with waypoints
      setPlannedRoute(points);
      setIsMapVisible(true);
    } catch (err) {
      console.error("plan route error", err);
      Alert.alert("Routing Error", "Could not plan the route.");
    }
  }

  // --------------------------------------------
  // Category filter toggle
  // --------------------------------------------
  function toggleCategoryFilter(category: string) {
    setFilterCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  }

  // --------------------------------------------
  // Wire up reminders when tasks list changes:
  // ensure active tasks have reminders scheduled via hook
  // --------------------------------------------
  useEffect(() => {
    tasks.forEach((t) => {
      if (t.status !== "completed") {
        scheduleReminder(t, 10).catch(() => {});
      } else {
        cancelReminder(t.id).catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // --------------------------------------------
  // Render
  // --------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      {/* tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === "today" && styles.tabActive]} onPress={() => setActiveTab("today")}>
          <Text style={[styles.tabTxt, activeTab === "today" && styles.tabTxtActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === "tomorrow" && styles.tabActive]} onPress={() => setActiveTab("tomorrow")}>
          <Text style={[styles.tabTxt, activeTab === "tomorrow" && styles.tabTxtActive]}>Tomorrow</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === "pending" && styles.tabActive]} onPress={() => setActiveTab("pending")}>
          <Text style={[styles.tabTxt, activeTab === "pending" && styles.tabTxtActive]}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.startBtn, { marginLeft: "auto" }]} onPress={handleStartMultiStopNavigation}>
          <Text style={styles.startBtnTxt}>Start</Text>
        </TouchableOpacity>
      </View>

      {/* search + filter row */}
      <View style={styles.searchRow}>
        <TextInput placeholder="Search tasks or locations..." placeholderTextColor="#999" style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
        <FilterDropdown categories={categories} selected={filterCategories} onChange={(s) => setFilterCategories(s)} />
      </View>

      {/* simple category chips */}
      <View style={styles.categoryRow}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = filterCategories.includes(item);
            return (
              <TouchableOpacity onPress={() => toggleCategoryFilter(item)} style={[styles.catChip, active && styles.catChipActive]}>
                <Text style={[styles.catChipTxt, active && styles.catChipTxtActive]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* task list */}
      <FlatList
        data={tasksForActiveTab}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onEdit={(t) => openNewTaskSheetForEdit(t)}
            onDelete={(id) =>
              Alert.alert("Delete task", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => removeTask(id) },
              ])
            }
            onMarkDone={(id) => markTaskCompleted(id)}
            onStartNavigation={(t) => startNavigationToTask(t)}
            onReschedule={(t) => handleReschedule(t)}
            onUpdateTask={(id, updates) => setTasks((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTxt}>No tasks in this view.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 140 }}
      />

      {/* floating add */}
      <TouchableOpacity style={styles.fab} onPress={openNewTaskSheetForCreate}>
        <Text style={styles.fabTxt}>＋</Text>
      </TouchableOpacity>

      {/* In-app Map Navigation modal */}
      <MapNavigationModal
        visible={isMapVisible}
        onClose={() => setIsMapVisible(false)}
        origin={userLocation ?? undefined}
        destinations={plannedRoute}
        optimizeRoute={true}
      />

      {/* NewTaskSheet modal (create/edit) */}
      <NewTaskSheet visible={isSheetOpen} onClose={() => setIsSheetOpen(false)} initialTask={editingTask} userName={"Shrividya"} onSubmitted={(saved) => upsertTaskFromSheet(saved)} />
    </SafeAreaView>
  );
}

// --------------------------------------------
// Styles
// --------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1020" },
  tabsRow: { flexDirection: "row", padding: 12, alignItems: "center" },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 12, marginRight: 8 },
  tabTxt: { color: "#9aa1ff", fontWeight: "600" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#4a6dff" },
  tabTxtActive: { color: "#fff" },
  startBtn: { backgroundColor: "#2f7dfe", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  startBtnTxt: { color: "#fff", fontWeight: "700" },

  searchRow: { flexDirection: "row", paddingHorizontal: 12, marginBottom: 8, alignItems: "center", gap: 8 },
  searchInput: { flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingHorizontal: 12, color: "#fff", height: 44 },
  categoryRow: { paddingHorizontal: 12, marginBottom: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.04)" },
  catChipActive: { backgroundColor: "#2f7dfe" },
  catChipTxt: { color: "#cdd6ff" },
  catChipTxtActive: { color: "#fff" },

  emptyWrap: { padding: 40, alignItems: "center" },
  emptyTxt: { color: "#9aa1ff" },

  fab: { position: "absolute", right: 18, bottom: 22, width: 64, height: 64, borderRadius: 32, backgroundColor: "#4a6dff", alignItems: "center", justifyContent: "center", elevation: Platform.OS === "android" ? 6 : 0 },
  fabTxt: { color: "#fff", fontSize: 32, lineHeight: 34 },
});
