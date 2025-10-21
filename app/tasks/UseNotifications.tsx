// useNotifications.ts
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { parseISO } from "date-fns";

// Task type (import if needed)
export type Task = {
  id: string;
  title: string;
  dueDate: string;
  status: string;
};

// Hook return shape
type UseNotificationsOptions = {
  onTaskReminderTap?: (taskId: string) => void;
};

export default function useNotifications({ onTaskReminderTap }: UseNotificationsOptions) {
  const scheduledRef = useRef<Map<string, string>>(new Map()); // taskId → notifId

  // Ask permission once
  useEffect(() => {
    (async () => {
      await Notifications.requestPermissionsAsync();
    })();

    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as any;
      if (data?.taskId && onTaskReminderTap) {
        onTaskReminderTap(data.taskId);
      }
    });

    return () => sub.remove();
  }, [onTaskReminderTap]);

  // Schedule reminder X minutes before due date
  async function scheduleReminder(task: Task, minutesBefore = 10) {
    // cancel old
    const old = scheduledRef.current.get(task.id);
    if (old) {
      await Notifications.cancelScheduledNotificationAsync(old).catch(() => {});
    }

    const due = parseISO(task.dueDate);
    const trigger = new Date(due.getTime() - minutesBefore * 60 * 1000);
    if (trigger <= new Date()) return; // skip past
const triggerDate = new Date(task.dueDate).getTime();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${task.title}`,
        body: `Due at ${due.toLocaleTimeString()}`,
        data: { taskId: task.id, type: "time" },
      },
      trigger:  {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: (triggerDate - Date.now()) / 1000, // relative delay in seconds
  }, // <-- FIXED: wrap trigger in an object
    });
    scheduledRef.current.set(task.id, id);
  }

  async function cancelReminder(taskId: string) {
    const id = scheduledRef.current.get(taskId);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      scheduledRef.current.delete(taskId);
    }
  }

  return { scheduleReminder, cancelReminder };
}
