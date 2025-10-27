// components/tasks/useGeofencing.tsx
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Task } from "../../lib/types"; // ✅ fixed path

// Distance threshold (in meters) for "arrival" at a task location
const ARRIVAL_RADIUS = 200;

type ActiveProximity = { [taskId: string]: boolean };

export function useGeofencing(tasks: Task[]) {
  const activeProximity = useRef<ActiveProximity>({});

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    async function startWatching() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission denied for geofencing");
        return;
      }

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 50 },
        (pos) => {
          const { latitude, longitude } = pos.coords;
          handleLocationUpdate(latitude, longitude);
        }
      );
    }

    function handleLocationUpdate(lat: number, lng: number) {
      tasks.forEach((task) => {
        if (!task.store) return;

        const [taskLatStr, taskLngStr] = task.store.split(",");
        const taskLat = parseFloat(taskLatStr);
        const taskLng = parseFloat(taskLngStr);
        if (isNaN(taskLat) || isNaN(taskLng)) return;

        const distance = getDistanceFromLatLonInM(
          lat,
          lng,
          taskLat,
          taskLng
        );

        const wasInside = activeProximity.current[task.id] || false;
        const isInside = distance <= ARRIVAL_RADIUS;

        if (!wasInside && isInside) {
          // Entered proximity
          activeProximity.current[task.id] = true;
          sendNotification(
            `You're near "${task.storeName || "here"}"`,
            `Don't forget to complete the task ${task.title || ""}.`
  //           `You left "${task.storeName}" Did you complete the task "${task.title}"?`,
  // `✅ Yes      ❌ No`
          );
        } else if (wasInside && !isInside) {
          // Left proximity
          activeProximity.current[task.id] = false;
            // Show interactive notification with Yes/No buttons
            Notifications.setNotificationCategoryAsync("TASK_LEFT", [
            { identifier: "YES", buttonTitle: "Yes", options: { opensAppToForeground: true } },
            { identifier: "NO", buttonTitle: "No", options: { opensAppToForeground: true } },
            ]);

            Notifications.scheduleNotificationAsync({
            content: {
              title: `Left "${task.title}" area`,
              body: "Did you complete it?",
              categoryIdentifier: "TASK_LEFT",
            },
            trigger: null,
            });
        }
      });
    }

    startWatching();

    return () => {
      subscription?.remove();
    };
  }, [tasks]);
}

async function sendNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null, // immediate
  });
}

function getDistanceFromLatLonInM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371e3; // Earth radius in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}
