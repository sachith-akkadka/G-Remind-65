import * as Linking from "expo-linking";
import { findTaskLocation } from "./api";
import { Task } from "../../lib/types";

export async function planAndStartRoute(tasks: Task[]) {
  const withLocations: Task[] = [];

  for (const t of tasks) {
    if (t.store) {
      withLocations.push(t);
    } else {
      const auto = await findTaskLocation(t.title);
      if (auto && auto.lat && auto.lng) {
        withLocations.push({
          ...t,
          store: `${auto.lat},${auto.lng}`,
          storeName: auto.name,
        });
      }
    }
  }

  if (withLocations.length === 0) {
    alert("No valid locations to navigate to.");
    return;
  }

  // Parse origin/destination
  const origin = withLocations[0].store!.split(",");
  const destination = withLocations[withLocations.length - 1].store!.split(",");
  const waypoints = withLocations
    .slice(1, -1)
    .map((t) => t.store)
    .join("|");

  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}${
    waypoints ? `&waypoints=${waypoints}` : ""
  }&travelmode=driving`;

  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    alert("Google Maps not available");
  }
}
