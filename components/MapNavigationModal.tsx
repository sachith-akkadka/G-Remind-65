// components/MapNavigationModal.tsx
// Full-screen map + Directions API route fetcher + simulated navigation (moving blue dot).
// Tries Google Directions -> OSRM fallback -> simulated interpolation (guaranteed UI route).
// Usage: same as before; pass origin (optional) and destinations (array of {lat,lng,name}).

import Constants from "expo-constants";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { AnimatedRegion, Marker, PROVIDER_GOOGLE, Polyline } from "react-native-maps";

// Polyline decoder - Google encoded polyline -> array of { latitude, longitude }
function decodePolyline(encoded: string) {
  if (!encoded) return [];
  const poly: { latitude: number; longitude: number }[] = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return poly;
}

type LatLng = { lat: number; lng: number; name?: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  origin?: { lat: number; lng: number } | null; // optional - if omitted we'll attempt to use device location
  destinations: LatLng[]; // one or more stops (last one is treated as destination)
  optimizeRoute?: boolean; // whether to ask Directions API to optimize waypoint order
};

export default function MapNavigationModal({
  visible,
  onClose,
  origin,
  destinations,
  optimizeRoute = true,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const markerRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [distanceText, setDistanceText] = useState<string | null>(null);
  const [durationText, setDurationText] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(true);
  const [speed] = useState(1); // multiplier for simulation speed (exposed later if needed)

  const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lng: number } | null>(null);

  // AnimatedRegion for smooth marker movement
  const animRegion = useRef<any>(null);
  useEffect(() => {
    animRegion.current = null; // reset on modal open/close
  }, [visible]);

  const API_KEY =
    (process.env.EXPO_PUBLIC_MAPS_API_KEY as string) ||
    (Constants?.expoConfig?.extra as any)?.EXPO_PUBLIC_MAPS_API_KEY ||
    "";

  if (!API_KEY) {
    console.warn(
      "MapNavigationModal: EXPO_PUBLIC_MAPS_API_KEY not set. Put it in your .env and ensure it's exposed to the app (app.config.js / expo-constants)."
    );
  }

  // Determine origin: prop origin, else device location
  useEffect(() => {
    let sub: any = null;
    (async () => {
      if (origin) {
        setDeviceLocation(origin);
        return;
      }
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Location permission not granted");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setDeviceLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        // also keep watching while modal is open in case user moves
        sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 5 }, (p) => {
          setDeviceLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
        });
      } catch (e) {
        console.warn("failed to get device location in MapNavigationModal:", e);
      }
    })();

    return () => {
      try {
        sub?.remove && sub.remove();
      } catch {}
    };
  }, [origin, visible]);

  // Build directions URL and fetch route when visible or destinations change
  useEffect(() => {
    if (!visible) return;
    if (!destinations || destinations.length === 0) {
      Alert.alert("No destinations", "No destinations provided for navigation.");
      return;
    }

    (async () => {
      setLoading(true);
      try {
        // ensure we have an origin
        let from = origin;
        if (!from) {
          // wait for deviceLocation to populate (up to ~2s)
          const start = Date.now();
          while (!deviceLocation && Date.now() - start < 2500) {
            await new Promise((r) => setTimeout(r, 200));
          }
          if (!deviceLocation) {
            Alert.alert("Location unavailable", "Could not determine your location to start navigation.");
            setLoading(false);
            return;
          }
          from = deviceLocation;
        }

        // directions origin -> destinations[destinations.length-1] with waypoints as intermediate stops
        const originParam = `${from.lat},${from.lng}`;
        const destPoint = destinations[destinations.length - 1];
        const destinationParam = `${destPoint.lat},${destPoint.lng}`;

        // waypoints: all destinations except final one (and except when only one dest)
        const intermediate = destinations.slice(0, -1);

        // Cap waypoints to a safe limit (Directions API has limits; avoid too-long strings)
        const MAX_WAYPOINTS = 20; // keep under Google's max (23) to be safe
        const intermediateCapped = intermediate.slice(0, MAX_WAYPOINTS);

        let waypointsParam = "";
        if (intermediateCapped.length > 0) {
          // build waypoints string (lat,lng|lat,lng|...) then encodeURIComponent the whole
          const pts = intermediateCapped.map((p) => `${p.lat},${p.lng}`).join("|");
          if (optimizeRoute) {
            const raw = `optimize:true|${pts}`;
            waypointsParam = `&waypoints=${encodeURIComponent(raw)}`;
          } else {
            waypointsParam = `&waypoints=${encodeURIComponent(pts)}`;
          }
        }

        // Build Google Directions URL
        const googleUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
          originParam
        )}&destination=${encodeURIComponent(destinationParam)}${waypointsParam}&mode=driving&key=${API_KEY}`;

        // ATTEMPT 1: Google Directions
        let usedGoogle = false;
        try {
          console.log("Directions URL:", googleUrl);
          const res = await fetch(googleUrl);
          // Even if res.ok true, the JSON may still contain status != OK
          const data = await res.json();
          console.log("Google Directions response:", data);

          if (data && data.status === "OK" && data.routes && data.routes.length > 0) {
            usedGoogle = true;
            const route = data.routes[0];
            const overview = route.overview_polyline?.points;
            const coords = decodePolyline(overview || "");
            setRouteCoords(coords);

            // set summary info
            if (route.legs && route.legs.length > 0) {
              let totalDist = 0;
              let totalDur = 0;
              route.legs.forEach((leg: any) => {
                totalDist += leg.distance?.value || 0;
                totalDur += leg.duration?.value || 0;
              });
              setDistanceText(`${(totalDist / 1000).toFixed(1)} km`);
              setDurationText(`${Math.round(totalDur / 60)} min`);
            }
          } else {
            console.warn("Google Directions not OK:", data?.status, data?.error_message);
          }
        } catch (gErr) {
          console.warn("Google Directions fetch/parsing failed:", gErr);
        }

        // If Google didn't work, try OSRM public server as a fallback (dev only)
        if (!usedGoogle) {
          console.log("Trying OSRM fallback...");
          try {
            // Build OSRM coordinates string: lon,lat;lon,lat;...
            const pointsForOSRM: string[] = [];
            pointsForOSRM.push(`${from.lng},${from.lat}`);
            // include all intermediates (use full 'intermediate' not just capped - but cap to reasonable)
            const osrmIntermediates = intermediate.slice(0, 50); // avoid extremely long URLs
            osrmIntermediates.forEach((p) => pointsForOSRM.push(`${p.lng},${p.lat}`));
            pointsForOSRM.push(`${destPoint.lng},${destPoint.lat}`);

            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pointsForOSRM.join(
              ";"
            )}?overview=full&geometries=geojson`;

            console.log("OSRM URL:", osrmUrl);
            const r2 = await fetch(osrmUrl);
            const osrmJson = await r2.json();
            console.log("OSRM response:", osrmJson);

            if (osrmJson && osrmJson.routes && osrmJson.routes.length > 0 && osrmJson.routes[0].geometry) {
              const coords = (osrmJson.routes[0].geometry.coordinates as [number, number][]).map(([lon, lat]) => ({
                latitude: lat,
                longitude: lon,
              }));
              setRouteCoords(coords);

              // OSRM provides distance (meters) and duration (seconds)
              const leg = osrmJson.routes[0];
              if (leg.distance) setDistanceText(`${(leg.distance / 1000).toFixed(1)} km`);
              if (leg.duration) setDurationText(`${Math.round(leg.duration / 60)} min`);
            } else {
              throw new Error("OSRM returned no route");
            }
          } catch (osrmErr) {
            console.warn("OSRM fallback failed:", osrmErr);

            // Final fallback: simulated interpolation across all stops so the UI still works
            console.log("Falling back to simulated interpolated polyline...");
            try {
              const interp: { latitude: number; longitude: number }[] = [];

              // Build sequence: from -> each intermediate -> destPoint
              const sequence = [from, ...intermediate, destPoint];

              // interpolate between consecutive points with N steps
              const stepsPerLeg = 20;
              for (let sIdx = 0; sIdx < sequence.length - 1; sIdx++) {
                const a = sequence[sIdx];
                const b = sequence[sIdx + 1];
                for (let i = 0; i <= stepsPerLeg; i++) {
                  const t = i / stepsPerLeg;
                  interp.push({
                    latitude: a.lat + (b.lat - a.lat) * t,
                    longitude: a.lng + (b.lng - a.lng) * t,
                  });
                }
              }

              setRouteCoords(interp);
              setDistanceText(null);
              setDurationText(null);
            } catch (finalErr) {
              console.error("Simulated fallback failed (unexpected):", finalErr);
              Alert.alert("Routing error", "Could not compute a route. Try again later.");
              setLoading(false);
              return;
            }
          }
        }

        // prepare animation region for marker start
        if (routeCoords && routeCoords.length > 0) {
          const start = routeCoords[0];
          // AnimatedRegion compatible object
          animRegion.current = new AnimatedRegion({
            latitude: start.latitude,
            longitude: start.longitude,
            latitudeDelta: 0,
            longitudeDelta: 0,
          } as any);

          // give map time to layout then animate to start
          setTimeout(() => {
            try {
              mapRef.current?.animateToRegion?.({
                latitude: start.latitude,
                longitude: start.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });
            } catch (e) {}
          }, 250);

          // start simulation (use the final routeCoords)
          startSimulation(routeCoords);
        } else {
          // routeCoords might have been set asynchronously above; if not, check again after small wait
          if (!animRegion.current && routeCoords.length === 0) {
            // nothing to animate
            console.warn("No route coordinates available after attempts.");
            Alert.alert("Route not found", "Could not determine a route for the requested stops.");
          }
        }
      } catch (err: any) {
        console.error("fetch directions failed (outer):", err);
        Alert.alert("Routing error", err?.message || "Failed to fetch route.");
      } finally {
        setLoading(false);
      }
    })();

    // cleanup on unmount/visible change
    return () => {
      stopSimulation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, destinations, deviceLocation, origin]);

  // Simulation logic
  const simRef = useRef<{ idx: number; timer: any | null; coords: any[] | null }>({ idx: 0, timer: null, coords: null });

  function stopSimulation() {
    if (simRef.current.timer) {
      clearInterval(simRef.current.timer);
      simRef.current.timer = null;
    }
    simRef.current.idx = 0;
    simRef.current.coords = null;
  }

  function startSimulation(coords: { latitude: number; longitude: number }[]) {
    stopSimulation();
    simRef.current.coords = coords;
    simRef.current.idx = 0;

    // step interval (ms) - smaller = smoother
    const baseInterval = 900; // ms per step at speed=1
    simRef.current.timer = setInterval(() => {
      if (!simRef.current.coords) return;
      const i = simRef.current.idx;
      if (i >= simRef.current.coords.length) {
        // finished
        clearInterval(simRef.current.timer as any);
        simRef.current.timer = null;
        setSimulating(false);
        return;
      }
      const next = simRef.current.coords[i];

      // animate marker using AnimatedRegion if available
      try {
        if (animRegion.current) {
          animRegion.current
            .timing({
              latitude: next.latitude,
              longitude: next.longitude,
              duration: Math.max(300, baseInterval / Math.max(0.1, speed)),
              useNativeDriver: false,
            })
            .start();
        }
      } catch (e) {
        // fallback to camera-only animation
      }

      // center map on next
      try {
        mapRef.current?.animateCamera?.(
          { center: { latitude: next.latitude, longitude: next.longitude }, zoom: 16, pitch: 45 },
          { duration: Math.max(300, baseInterval / Math.max(0.1, speed)) }
        );
      } catch (e) {}

      simRef.current.idx = i + 1;
    }, Math.max(200, Math.round(900 / Math.max(0.1, speed))));
  }

  // UI
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Navigation</Text>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            {distanceText ? <Text style={styles.infoText}>{distanceText}</Text> : null}
            {durationText ? <Text style={styles.infoText}>{durationText}</Text> : null}
            <TouchableOpacity
              onPress={() => {
                stopSimulation();
                onClose();
              }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeTxt}>End</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mapWrap}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" />
            </View>
          )}

          <MapView
            ref={(r) => {
              mapRef.current = r;
            }}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            showsUserLocation={true}
            followsUserLocation={false}
            toolbarEnabled={false}
            initialRegion={{
              latitude: deviceLocation?.lat ?? destinations[0]?.lat ?? 12.97,
              longitude: deviceLocation?.lng ?? destinations[0]?.lng ?? 77.59,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {/* Destination markers */}
            {destinations.map((d, i) => (
              <Marker key={`dest-${i}`} coordinate={{ latitude: d.lat, longitude: d.lng }} title={d.name || `Stop ${i + 1}`} />
            ))}

            {/* route polyline */}
            {routeCoords.length > 0 && <Polyline coordinates={routeCoords.map((c) => ({ latitude: c.latitude, longitude: c.longitude }))} strokeWidth={5} />}

            {/* animated moving marker */}
            {animRegion.current ? (
              // @ts-ignore - MarkerAnimated typing sometimes differs between versions
              <Marker.Animated ref={markerRef} coordinate={animRegion.current} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.blueDot} />
              </Marker.Animated>
            ) : null}
          </MapView>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => {
              if (simulating) {
                // pause
                if (simRef.current.timer) {
                  clearInterval(simRef.current.timer);
                  simRef.current.timer = null;
                  setSimulating(false);
                }
              } else {
                // resume
                if (routeCoords && routeCoords.length > 0) {
                  setSimulating(true);
                  startSimulation(routeCoords);
                }
              }
            }}
          >
            <Text style={styles.controlTxt}>{simulating ? "Pause" : "Resume"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => {
              // jump to user location
              if (deviceLocation) {
                mapRef.current?.animateCamera({ center: { latitude: deviceLocation.lat, longitude: deviceLocation.lng }, zoom: 16 }, { duration: 400 });
              }
            }}
          >
            <Text style={styles.controlTxt}>My Location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: "#ff4d4f" }]}
            onPress={() => {
              stopSimulation();
              onClose();
            }}
          >
            <Text style={[styles.controlTxt, { color: "#fff" }]}>End Route</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1020" },
  header: { padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  infoText: { color: "#cdd6ff", marginLeft: 8 },
  closeBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 8 },
  closeTxt: { color: "#fff", fontWeight: "700" },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  blueDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2f7dfe",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  controls: { padding: 12, flexDirection: "row", justifyContent: "space-between", gap: 8 },
  controlBtn: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 8 },
  controlTxt: { color: "#fff", fontWeight: "700" },
});
