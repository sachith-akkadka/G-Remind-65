import { format, parseISO } from "date-fns";
import React, { useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Task } from "./page";
import Swipeable from "react-native-gesture-handler/Swipeable";
import * as Haptics from "expo-haptics";
import { RectButton } from "react-native-gesture-handler";

type Props = {
  task: Task;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onMarkDone: (id: string) => void;
  // can return a Promise (page.tsx's handler is async) — we await it to show a spinner
  onStartNavigation: (t: Task) => Promise<void> | void;
  onReschedule: (t: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
};

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  onMarkDone,
  onStartNavigation,
  onReschedule,
  onUpdateTask,
}: Props) {
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [starting, setStarting] = useState(false);

  const leftBorderColor = useMemo(() => {
    switch (task.priority) {
      case "high":
        return "#ff5c5c";
      case "medium":
        return "#f0c000";
      default:
        return "#66cc66";
    }
  }, [task.priority]);

  const dueText = useMemo(() => {
    try {
      const d = parseISO(task.dueDate);
      return format(d, "PPP, p");
    } catch {
      return task.dueDate;
    }
  }, [task.dueDate]);

  const parsedSubtasks = useMemo(() => {
    const subs: { id: string; title: string; completed: boolean }[] = [];
    if (!task.description) return subs;
    const lines = task.description.split("\n").slice(0, 10);
    lines.forEach((ln, idx) => {
      const trimmed = ln.trim();
      const md = trimmed.match(/^- \[( |x|X)\] (.*)/);
      if (md) {
        subs.push({
          id: `${task.id}-sub-${idx}`,
          title: md[2],
          completed: md[1].toLowerCase() === "x",
        });
      }
    });
    return subs;
  }, [task.description, task.id]);

  function toggleSubtaskCompleted(subId: string) {
    if (!task.description) return;
    const lines = task.description.split("\n");
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
      const title = parsedSubtasks.find((s) => s.id === subId)?.title;
      if (!title) continue;
      const mdIdx = lines.findIndex((l) => l.includes(title));
      if (mdIdx >= 0) {
        const cur = lines[mdIdx];
        if (cur.includes("[ ]")) lines[mdIdx] = cur.replace("[ ]", "[x]");
        else if (cur.includes("[x]")) lines[mdIdx] = cur.replace("[x]", "[ ]");
        changed = true;
        break;
      }
    }
    if (changed) {
      const newDesc = lines.join("\n");
      onUpdateTask(task.id, { description: newDesc });
    } else {
      Alert.alert("Subtask", "Could not toggle subtask in current format.");
    }
  }

  // --- Swipe Actions ---
  const renderLeftActions = () => (
    <RectButton
      style={[styles.swipeAction, { backgroundColor: "#007bff" }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onEdit(task);
      }}
    >
      <Text style={styles.swipeText}>Edit</Text>
    </RectButton>
  );

  const renderRightActions = () => (
    <RectButton
      style={[styles.swipeAction, { backgroundColor: "#ff3b30" }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDelete(task.id);
      }}
    >
      <Text style={styles.swipeText}>Delete</Text>
    </RectButton>
  );

  // Start button handler: await the parent's async resolver so we can show spinner
  async function handleStartPress() {
    if (starting) return;
    try {
      setStarting(true);
      await onStartNavigation(task);
    } catch (err) {
      console.error("onStartNavigation error:", err);
      Alert.alert("Navigation Error", "Could not start navigation.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableLeftOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onEdit(task);
      }}
      onSwipeableRightOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDelete(task.id);
      }}
    >
      <View style={[styles.card, { borderLeftColor: leftBorderColor }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{task.title}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.badge}>{task.status}</Text>
          <Text style={[styles.badge, { marginLeft: 8 }]}>{task.category}</Text>
        </View>

        <Text style={styles.detail}>Due: {dueText}</Text>
        {task.storeName ? <Text style={styles.detail}>📍 {task.storeName}</Text> : null}

        {parsedSubtasks.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <TouchableOpacity onPress={() => setShowSubtasks((s) => !s)}>
              <Text style={{ color: "#cfe0ff", fontWeight: "600" }}>{showSubtasks ? "Hide" : "Show"} subtasks</Text>
            </TouchableOpacity>
            {showSubtasks && (
              <FlatList
                style={{ marginTop: 8 }}
                data={parsedSubtasks}
                keyExtractor={(s) => s.id}
                renderItem={({ item }) => (
                  <View style={styles.subtaskRow}>
                    <Switch value={item.completed} onValueChange={() => toggleSubtaskCompleted(item.id)} />
                    <Text
                      style={[
                        styles.subtaskTxt,
                        item.completed && {
                          textDecorationLine: "line-through",
                          color: "#aaa",
                        },
                      ]}
                    >
                      {item.title}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.smallBtn, starting ? { opacity: 0.7 } : undefined]}
            onPress={handleStartPress}
            disabled={starting}
          >
            {starting ? <ActivityIndicator color="#fff" /> : <Text style={styles.smallBtnTxt}>Start</Text>}
          </TouchableOpacity>

          {task.status === "missed" && (
            <TouchableOpacity style={[styles.smallBtn, { backgroundColor: "#f0a500" }]} onPress={() => onReschedule(task)}>
              <Text style={styles.smallBtnTxt}>Reschedule</Text>
            </TouchableOpacity>
          )}

          {task.status !== "completed" && (
            <TouchableOpacity style={[styles.smallBtn, { backgroundColor: "#3bbf73" }]} onPress={() => onMarkDone(task.id)}>
              <Text style={styles.smallBtnTxt}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 6,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#fff", fontSize: 16, fontWeight: "700", flex: 1 },
  metaRow: { flexDirection: "row", marginTop: 8 },
  badge: {
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  detail: { color: "#cbd7ff", marginTop: 8 },
  subtaskRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  subtaskTxt: { color: "#fff", marginLeft: 8 },
  footer: { flexDirection: "row", marginTop: 12, justifyContent: "space-between" },
  smallBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  smallBtnTxt: { color: "#fff", fontWeight: "600" },
  swipeAction: {
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    flex: 1,
  },
  swipeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
