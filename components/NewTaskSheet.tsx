// components/NewTaskSheet.tsx
import { suggestLocations } from "@/app/ai/suggestLocations";
import { suggestTaskCategory } from "@/app/ai/suggestTaskCategory";
import { suggestTasks } from "@/app/ai/suggestTasks";
import { findTaskLocation } from "@/app/tasks/api";
import { db } from "@/lib/firebase";
import { Task } from "@/lib/types";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Region as MapRegion,
  Marker,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { getAuth } from "firebase/auth";


// Notification handler (keeps this app-friendly)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type Priority = "low" | "medium" | "high";
type Recurring = "none" | "daily" | "weekly";
type Status = "pending" | "today" | "tomorrow" | "missed" | "completed";

type FirestoreTaskLike = {
  title: string;
  description?: string | null;
  dueDate: string;
  store?: string | null;
  storeName?: string | null;
  status: Status;
  category: string;
  priority?: Priority;
  recurring?: Exclude<Recurring, "none"> | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  initialTask?: Task | null;
  userName?: string | null;
  onSubmitted?: (taskFromServer: any) => void;
  defaultReminderMinutes?: number;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function isToday(date: Date) {
  return startOfDay(date).getTime() === startOfDay(new Date()).getTime();
}
function isTomorrow(date: Date) {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return startOfDay(date).getTime() === startOfDay(t).getTime();
}

const NewTaskSheet: React.FC<Props> = ({
  visible,
  onClose,
  initialTask = null,
  userName,
  onSubmitted,
  defaultReminderMinutes = 10,
}) => {
  // Form states
  const [title, setTitle] = useState(initialTask?.title || "");
  const [description, setDescription] = useState(
    initialTask?.description || ""
  );
  const [dueDate, setDueDate] = useState<Date>(
    initialTask ? new Date(initialTask.dueDate) : new Date()
  );
  const [hour, setHour] = useState(() => {
    const d = initialTask ? new Date(initialTask.dueDate) : new Date();
    let h = d.getHours();
    let ampm = "AM";
    if (h >= 12) ampm = "PM";
    h = h % 12;
    if (h === 0) h = 12;
    return String(h).padStart(2, "0");
  });
  const [minute, setMinute] = useState(() => {
    const d = initialTask ? new Date(initialTask.dueDate) : new Date();
    return String(d.getMinutes()).padStart(2, "0");
  });
  const [ampm, setAmpm] = useState<"AM" | "PM">(() => {
    const d = initialTask ? new Date(initialTask.dueDate) : new Date();
    return d.getHours() >= 12 ? "PM" : "AM";
  });

  const [priority, setPriority] = useState<Priority>(
    (initialTask?.priority as Priority) ?? "medium"
  );
  const [recurring, setRecurring] = useState<Recurring>(
    (initialTask?.recurring as Recurring) ?? "none"
  );

  const [region, setRegion] = useState<MapRegion | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [storeLatLng, setStoreLatLng] = useState<string | undefined>(
    initialTask?.store ?? undefined
  );
  const [storeName, setStoreName] = useState<string>(
    initialTask?.storeName || ""
  );

  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
  } | null>(null);

  // Suggestions state
  const [taskSuggestions, setTaskSuggestions] = useState<string[]>([]);
  const [loadingTaskSugg, setLoadingTaskSugg] = useState(false);
  const [showTaskSugg, setShowTaskSugg] = useState(false);
  const [showPlaceSugg, setShowPlaceSugg] = useState(false);

  const [placeQuery, setPlaceQuery] = useState("");
  const [placeSuggestions, setPlaceSuggestions] = useState<
    {
      name: string;
      lat: number;
      lng: number;
      description?: string;
      eta?: string;
      city?: string;
      address?: string;
    }[]
  >([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [locationInputFocused, setLocationInputFocused] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showRecurringDropdown, setShowRecurringDropdown] = useState(false);

  const taskTimer = useRef<number | null>(null);
  const placeTimer = useRef<number | null>(null);

  const greeting = useMemo(() => {
    if (initialTask) return "Update your task details";
    if (userName && userName.trim().length > 0)
      return `Hey, ${userName}! What's on your mind today?`;
    return "Hey there! What's on your mind today?";
  }, [initialTask, userName]);

  const ensureCoords = useCallback(async (): Promise<{
    lat: number;
    lng: number;
  } | null> => {
    try {
      if (currentLocation) return currentLocation;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCurrentLocation(coords);
      return coords;
    } catch (e) {
      console.warn("ensureCoords failed:", e);
      return null;
    }
  }, [currentLocation]);
  // Reset form helper (only when creating a fresh new task)
  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setDueDate(new Date());
    const d = new Date();
    let hh = d.getHours();
    const am = hh >= 12 ? "PM" : "AM";
    hh = hh % 12;
    if (hh === 0) hh = 12;
    setHour(String(hh).padStart(2, "0"));
    setMinute(String(d.getMinutes()).padStart(2, "0"));
    setAmpm(am as "AM" | "PM");
    setPriority("medium");
    setRecurring("none");
    setRegion(null);
    setCurrentLocation(null);
    setStoreLatLng(undefined);
    setStoreName("");
    setIsLocationPickerOpen(false);
    setSelectedLocation(null);
    setTaskSuggestions([]);
    setShowTaskSugg(false);
    setPlaceQuery("");
    setPlaceSuggestions([]);
    setLoadingPlaces(false);
    setLocationInputFocused(false);
  }, []);

  // Reset when sheet opens for a new task (prevents leftover content on reopening)
  useEffect(() => {
    if (visible) {
      if (!initialTask) {
        resetForm();
      } else {
        // If editing an initialTask, populate from it
        setTitle(initialTask.title ?? "");
        setDescription(initialTask.description ?? "");
        setDueDate(new Date(initialTask.dueDate));
        const d = new Date(initialTask.dueDate);
        let h = d.getHours();
        setAmpm(h >= 12 ? "PM" : "AM");
        h = h % 12;
        if (h === 0) h = 12;
        setHour(String(h).padStart(2, "0"));
        setMinute(String(d.getMinutes()).padStart(2, "0"));
        setPriority((initialTask.priority as Priority) ?? "medium");
        setRecurring((initialTask.recurring as Recurring) ?? "none");
        setStoreLatLng(initialTask.store ?? undefined);
        setStoreName(initialTask.storeName ?? "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Request location when location picker opens (and also set initial region)
  useEffect(() => {
    if (isLocationPickerOpen) {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            // fallback to Kasaragod
            setRegion({
              latitude: 12.7687,
              longitude: 75.2071,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            });
            return;
          }

          const loc = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = loc.coords;

          setCurrentLocation({ lat: latitude, lng: longitude });
          setRegion({
            latitude,
            longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
        } catch (e) {
          console.warn("Location permission / get failed:", e);
          // fallback to Putturu
          setRegion({
            latitude: 12.7687,
            longitude: 75.2071,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
        }
      })();
    }
  }, [isLocationPickerOpen]);

  // Debounced task suggestions
  useEffect(() => {
    if (!visible) return;
    if (taskTimer.current) {
      clearTimeout(taskTimer.current);
      taskTimer.current = null;
    }
    const q = title.trim();
    if (q.length < 1) {
      setTaskSuggestions([]);
      setShowTaskSugg(false);
      setLoadingTaskSugg(false);
      return;
    }
    setShowTaskSugg(true);
    setLoadingTaskSugg(true);
    taskTimer.current = setTimeout(async () => {
      try {
        const data = await suggestTasks(q);
        // fallback suggestions if API returns empty
        if (!data || data.length === 0) {
          const fallback = [
            q,
            q.startsWith("Buy") ? q : `Buy ${q}`,
            `Pick up ${q}`,
            `Order ${q}`,
          ].map((s) => s.trim());
          setTaskSuggestions(fallback.slice(0, 4));
        } else {
          setTaskSuggestions(data.slice(0, 4));
        }
      } catch (err) {
        console.warn("suggestTasks failed:", err);
        const fallback = [
          q,
          q.startsWith("Buy") ? q : `Buy ${q}`,
          `Pick up ${q}`,
        ];
        setTaskSuggestions(fallback.slice(0, 4));
      } finally {
        setLoadingTaskSugg(false);
      }
    }, 300) as unknown as number;
    return () => {
      if (taskTimer.current) {
        clearTimeout(taskTimer.current);
        taskTimer.current = null;
      }
    };
  }, [title, visible]);

  // Debounced location suggestions (used when typing)
  // Debounced location suggestions (mirrors task suggestions behavior)
  useEffect(() => {
    if (!visible) return;

    if (placeTimer.current) {
      clearTimeout(placeTimer.current);
      placeTimer.current = null;
    }

    const q =
      placeQuery && placeQuery.trim().length > 0
        ? placeQuery.trim()
        : title.trim();
    if (q.length < 1) {
      setPlaceSuggestions([]);
      setShowPlaceSugg(false);
      setLoadingPlaces(false);
      return;
    }

    setShowPlaceSugg(true);
    setLoadingPlaces(true);

    placeTimer.current = setTimeout(async () => {
      try {
        // ensure coords once before calling suggestLocations
        const coords = await ensureCoords();
        const near = coords ? `${coords.lat},${coords.lng}` : undefined;
        const data = await suggestLocations(q, near);

        if (!data || data.length === 0) {
          if (coords) {
            setPlaceSuggestions([
              {
                name: "Nearby place",
                lat: coords.lat,
                lng: coords.lng,
                description: "Your current location (fallback)",
                eta: "N/A",
              },
            ]);
          } else {
            setPlaceSuggestions([]);
          }
        } else {
          setPlaceSuggestions(
            data.slice(0, 6).map((it: any) => ({
              name: it.name,
              lat: it.lat,
              lng: it.lng,
              description: it.description,
              eta: it.eta ?? undefined,
              city: (it as any).city ?? undefined, // if server returned city
            }))
          );
        }
      } catch (err) {
        console.warn("suggestLocations failed:", err);
        const coords = currentLocation;
        if (coords) {
          setPlaceSuggestions([
            {
              name: "Nearby place",
              lat: coords.lat,
              lng: coords.lng,
              description: "Your current location (fallback)",
              eta: "N/A",
            },
          ]);
        } else {
          setPlaceSuggestions([]);
        }
      } finally {
        setLoadingPlaces(false);
      }
    }, 300) as unknown as number;

    return () => {
      if (placeTimer.current) {
        clearTimeout(placeTimer.current);
        placeTimer.current = null;
      }
    };
  }, [placeQuery, title, currentLocation, visible]);
  // inside NewTaskSheet component, add this helper

  // Immediate fetch of locations (call when focusing the location input)
  const fetchPlacesImmediate = useCallback(
    async (q?: string) => {
      const query = (q ?? placeQuery ?? title).trim();
      if (query.length < 1) {
        setPlaceSuggestions([]);
        return;
      }
      setLoadingPlaces(true);
      try {
        const near = currentLocation
          ? `${currentLocation.lat},${currentLocation.lng}`
          : undefined;
        const data = await suggestLocations(query, near);
        if (!data || data.length === 0) {
          if (currentLocation) {
            setPlaceSuggestions([
              {
                name: "Nearby place",
                lat: currentLocation.lat,
                lng: currentLocation.lng,
                description: "Your current location (fallback)",
              },
            ]);
          } else {
            setPlaceSuggestions([]);
          }
        } else {
          setPlaceSuggestions(data.slice(0, 6));
        }
      } catch (err) {
        console.warn("suggestLocations immediate failed:", err);
        if (currentLocation) {
          setPlaceSuggestions([
            {
              name: "Nearby place",
              lat: currentLocation.lat,
              lng: currentLocation.lng,
              description: "Your current location (fallback)",
            },
          ]);
        } else {
          setPlaceSuggestions([]);
        }
      } finally {
        setLoadingPlaces(false);
      }
    },
    [placeQuery, title, currentLocation]
  );

  // Compose combined due date
  const getCombinedDueDate = useCallback(() => {
    const d = new Date(dueDate);
    let h = parseInt(hour, 10);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    d.setHours(h, parseInt(minute, 10) || 0, 0, 0);
    return d;
  }, [dueDate, hour, minute, ampm]);

  // Submit handler (auto-select nearest if not chosen) — improved logic
  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert("Please add a title");
      return;
    }
    setSubmitting(true);
    try {
      let finalStore = storeLatLng;
      let finalStoreName = storeName;

      const ensureCurrentLocation = async () => {
        // Try to ensure currentLocation is set (request permission if needed)
        try {
          if (!currentLocation) {
            const { status } =
              await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
              const loc = await Location.getCurrentPositionAsync({});
              const { latitude, longitude } = loc.coords;
              setCurrentLocation({ lat: latitude, lng: longitude });
              return { lat: latitude, lng: longitude };
            }
            return null;
          }
          return currentLocation;
        } catch (e) {
          console.warn("ensureCurrentLocation failed:", e);
          return null;
        }
      };

      // Attempt 1: try existing currentLocation / cached coords
      if (!finalStore) {
        const near = currentLocation
          ? `${currentLocation.lat},${currentLocation.lng}`
          : undefined;
        try {
          const found = await findTaskLocation(title.trim(), near);
          if (found && found.lat != null && found.lng != null) {
            finalStore = `${found.lat},${found.lng}`;
            finalStoreName = found.name || "Nearby location";
            // update UI state immediately so user sees what's saved
            setStoreLatLng(finalStore);
            setStoreName(finalStoreName);
          }
        } catch (e) {
          console.warn("findTaskLocation failed (first):", e);
        }
      }

      // Attempt 2: if still not found, try to request device coords and call API again
      if (!finalStore) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Location.getCurrentPositionAsync({});
            const coords = `${loc.coords.latitude},${loc.coords.longitude}`;
            try {
              const found2 = await findTaskLocation(title.trim(), coords);
              if (found2 && found2.lat != null && found2.lng != null) {
                finalStore = `${found2.lat},${found2.lng}`;
                finalStoreName = found2.name || "Nearby location";
                setStoreLatLng(finalStore);
                setStoreName(finalStoreName);
              } else {
                // fallback to raw coords as a last resort (still meaningful)
                finalStore = coords;
                finalStoreName = "Nearby location";
                setStoreLatLng(finalStore);
                setStoreName(finalStoreName);
              }
            } catch (e) {
              console.warn("findTaskLocation (second) failed:", e);
              finalStore = coords;
              finalStoreName = "Nearby location";
              setStoreLatLng(finalStore);
              setStoreName(finalStoreName);
            }
          } else {
            // no permission to get coords — we will block or prompt user (choose behaviour)
            // here we'll block creation and ask them to pick location (prevents missing location)
            Alert.alert(
              "Location permission required",
              "Allow location permission or pick a location manually so we can assign nearest store."
            );
            throw new Error("No location permission");
          }
        } catch (e) {
          // bubble up to outer try/catch — prevents saving without a location
          console.warn("ensure-get-current-location failed:", e);
          // Do not rethrow; we'll handle missing location below gracefully
          console.warn("ensure-get-current-location failed (swallowed):", e);
        }
      }

      // If still no finalStore and we couldn't fetch coords, block creation & alert user
      if (!finalStore) {
        Alert.alert(
          "No location found",
          "Could not automatically find a place for this task. Please pick a location or allow location permission."
        );
        throw new Error("No location available");
      }

      const when = getCombinedDueDate();
      let newStatus: Status = "pending";
      if (isToday(when)) newStatus = "today";
      else if (isTomorrow(when)) newStatus = "tomorrow";
      else if (when.getTime() < startOfDay(new Date()).getTime())
        newStatus = "missed";

      let category = "Uncategorized";
      try {
        const cat = await suggestTaskCategory(title.trim());
        if (cat) category = cat;
      } catch (e) {
        console.warn("suggestTaskCategory failed:", e);
      }
      const auth = getAuth();
const user = auth.currentUser;

if (!user) {
  Alert.alert("Please log in", "You must be signed in to create tasks.");
  setSubmitting(false);
  return;
}

      const payload: FirestoreTaskLike & { userId: string; userEmail: string } = {
  title: title.trim(),
  description: description.trim() ? description.trim() : null,
  dueDate: when.toISOString(),
  store: finalStore ? finalStore : null,
  storeName: finalStoreName ? finalStoreName : null,
  status: initialTask ? newStatus : "pending",
  category,
  priority,
  recurring: recurring === "none" ? null : recurring as Exclude<Recurring, "none">,
  userId: user.uid,
  userEmail: user.email || "unknown",
};

      let saved;
      if (initialTask?.id) {
        const taskRef = doc(db, "tasks", initialTask.id);
        await setDoc(taskRef, payload, { merge: true });
        saved = { id: initialTask.id, ...payload };
      } else {
        const docRef = await addDoc(collection(db, "tasks"), payload);
        saved = { id: docRef.id, ...payload };
      }

      onSubmitted?.(saved);

      // After successful save, reset form so when the sheet is opened again with no initialTask it's fresh
      resetForm();
      onClose();
    } catch (err: any) {
      if ((err as Error).message === "No location available") {
        // already alerted
      } else {
        console.warn("save failed:", err);
        Alert.alert("Save failed", err?.message || "Could not save task");
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    title,
    description,
    storeLatLng,
    storeName,
    currentLocation,
    getCombinedDueDate,
    initialTask,
    priority,
    recurring,
    onSubmitted,
    onClose,
    resetForm,
  ]);

  // UI helpers
  const handleSelectTaskSuggestion = (s: string) => {
    setTitle(s);
    setShowTaskSugg(false);
    setTaskSuggestions([]);
    Keyboard.dismiss();
  };

  const handleSelectPlace = (p: { name: string; lat: number; lng: number }) => {
    setStoreLatLng(`${p.lat},${p.lng}`);
    setStoreName(p.name);
    setPlaceQuery("");
    setPlaceSuggestions([]);
    setLocationInputFocused(false);
    Keyboard.dismiss();
  };

  // Date/time picker visibility (Android style)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Hide suggestions when other fields get focus
  const hideAllSuggestions = () => {
    // small timeout helps suggestion press to register
    setTimeout(() => {
      setShowTaskSugg(false);
      setTaskSuggestions([]);
      setPlaceSuggestions([]);
      setLoadingTaskSugg(false);
      setLoadingPlaces(false);
    }, 120);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {initialTask ? "Edit Task" : "Create a New Task"}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>x</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>{greeting}</Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Task Title */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Task Title</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  placeholder="e.g., Pick up dry cleaning"
                  placeholderTextColor="#ccc"
                  value={title}
                  onChangeText={(t) => {
                    setTitle(t);
                    setShowTaskSugg(true);
                  }}
                  onFocus={() => {
                    // show title suggestions when focusing title
                    setShowTaskSugg(true);
                    setLocationInputFocused(false);
                    // hide place suggestions
                    setPlaceSuggestions([]);
                    setLoadingPlaces(false);
                  }}
                  onBlur={() => {
                    // hide suggestions slightly after blur so suggestion taps can register
                    setTimeout(() => {
                      setShowTaskSugg(false);
                    }, 120);
                  }}
                  style={[styles.input, styles.tallerInput]}
                  returnKeyType="done"
                />
                {loadingTaskSugg && (
                  <ActivityIndicator style={styles.loadingIcon} />
                )}
              </View>

              {showTaskSugg && taskSuggestions.length > 0 && (
                <View style={styles.suggPanel}>
                  {taskSuggestions.map((s, i) => (
                    <Pressable
                      key={`${s}-${i}`}
                      onPress={() => handleSelectTaskSuggestion(s)}
                      style={styles.suggItem}
                    >
                      <Text style={styles.suggText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                placeholder="Add extra details..."
                placeholderTextColor="#ccc"
                value={description}
                onChangeText={setDescription}
                onFocus={() => hideAllSuggestions()}
                style={[styles.input, styles.multiline]}
                multiline
              />
            </View>

            {/* Location (input + map button) */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Location (Optional)</Text>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    placeholder="Search a place..."
                    placeholderTextColor="#ccc"
                    value={storeName}
                    onChangeText={(t) => {
                      setStoreName(t);
                      setPlaceQuery(t); // drive suggestions from placeQuery
                      setShowPlaceSugg(true); // show panel while typing (mirrors task behavior)
                    }}
                    onFocus={async () => {
                      setPlaceSuggestions([]);
                      setLoadingPlaces(true);
                      setLocationInputFocused(true);
                      setShowPlaceSugg(true);
                      const initialQuery =
                        storeName?.trim()?.length > 0 ? storeName : title;
                      if (!initialQuery || initialQuery.trim().length === 0) {
                        setLoadingPlaces(false);
                        setShowPlaceSugg(false);
                        return;
                      }

                      try {
                        const coords = await ensureCoords();
                        const near = coords
                          ? `${coords.lat},${coords.lng}`
                          : undefined;
                        const normalized = await suggestLocations(
                          initialQuery.trim(),
                          near
                        );
                        setPlaceSuggestions(normalized.slice(0, 6));
                        console.log("suggestLocations (focus):", {
                          q: initialQuery.trim(),
                          near,
                          normalized,
                        });
                      } catch (err) {
                        console.warn("suggestLocations (focus) failed:", err);
                        setPlaceSuggestions([]);
                      } finally {
                        setLoadingPlaces(false);
                      }

                      setShowTaskSugg(false);
                    }}
                    onBlur={() => {
                      // small delay so taps on suggestions still register
                      setTimeout(() => {
                        setLocationInputFocused(false);
                        setShowPlaceSugg(false);
                      }, 240);
                    }}
                    style={[styles.input, styles.tallerInput]}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => {
                    // open location picker map
                    setIsLocationPickerOpen(true);
                    // hide any suggestion lists
                    hideAllSuggestions();
                  }}
                  style={styles.mapBtn}
                >
                  <Image
                    source={require("../assets/images/map_logo.png")}
                    style={styles.mapIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>

              {/* Render place suggestions */}
              {loadingPlaces && <ActivityIndicator style={{ marginTop: 8 }} />}

              {showPlaceSugg && placeSuggestions.length > 0 && (
                <View style={[styles.placeList, { maxHeight: 216, overflow: "hidden" }]}>
                    <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    >
                    {placeSuggestions.slice(0, 3).map((p, i) => (
                      <Pressable
                      key={`${p.name}-${i}`}
                      style={styles.placeItem}
                      onPress={() => handleSelectPlace(p)}
                      >
                      <View
                        style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        }}
                      >
                        <Text style={styles.placeTitle}>{p.name}</Text>
                        {p.eta ? (
                        <Text style={styles.placeETA}>{p.eta}</Text>
                        ) : null}
                      </View>
                      {(p as any).city ? (
                        <Text style={styles.placeSubtitle}>
                        {(p as any).city}
                        </Text>
                      ) : p.address ? (
                        <Text style={styles.placeSubtitle}>
                        {p.address}
                        </Text>
                      ) : null}
                      </Pressable>
                    ))}
                    </ScrollView>
                </View>
              )}

              {storeLatLng ? (
                <Text style={styles.chosenLoc}>
                  Selected: {storeName || "Custom"} — {storeLatLng}
                </Text>
              ) : null}

              {/* Map picker modal (partial height) */}
              <Modal
                visible={isLocationPickerOpen}
                animationType="slide"
                onRequestClose={() => setIsLocationPickerOpen(false)}
              >
                <SafeAreaView style={{ flex: 1, backgroundColor: "#0b1020" }}>
                  <View style={styles.mapHeader}>
                    <Text
                      style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}
                    >
                      Select Location
                    </Text>
                    <TouchableOpacity
                      onPress={() => setIsLocationPickerOpen(false)}
                    >
                      <Text style={{ color: "#3b82f6", fontSize: 16 }}>X</Text>
                    </TouchableOpacity>
                  </View>

                  {region ? (
                    <>
                      <MapView
                        style={styles.map}
                        provider={PROVIDER_GOOGLE}
                        initialRegion={region}
                        onPress={(e) => {
                          const { latitude, longitude } =
                            e.nativeEvent.coordinate;
                          setSelectedLocation({
                            latitude,
                            longitude,
                            name: "Custom Location",
                          });
                        }}
                      >
                        {selectedLocation && (
                          <Marker
                            coordinate={{
                              latitude: selectedLocation.latitude,
                              longitude: selectedLocation.longitude,
                            }}
                            title={selectedLocation.name}
                          />
                        )}
                        {!selectedLocation && currentLocation && (
                          <Marker
                            coordinate={{
                              latitude: currentLocation.lat,
                              longitude: currentLocation.lng,
                            }}
                            title="You"
                            pinColor="blue"
                          />
                        )}
                      </MapView>

                      <View style={styles.mapFooter}>
                        <Text style={{ color: "#fff", marginBottom: 10 }}>
                          {selectedLocation
                            ? `Selected: ${selectedLocation.latitude.toFixed(
                                4
                              )}, ${selectedLocation.longitude.toFixed(4)}`
                            : currentLocation
                            ? `Centered at: ${currentLocation.lat.toFixed(
                                4
                              )}, ${currentLocation.lng.toFixed(4)}`
                            : "Tap a location on the map"}
                        </Text>

                        <TouchableOpacity
                          onPress={() => {
                            if (!selectedLocation) {
                              if (currentLocation) {
                                setStoreLatLng(
                                  `${currentLocation.lat},${currentLocation.lng}`
                                );
                                setStoreName("Nearby location");
                                setIsLocationPickerOpen(false);
                                return;
                              }
                              Alert.alert("Please select a location first");
                              return;
                            }
                            setStoreLatLng(
                              `${selectedLocation.latitude},${selectedLocation.longitude}`
                            );
                            setStoreName(
                              selectedLocation.name || "Custom Location"
                            );
                            setIsLocationPickerOpen(false);
                          }}
                          style={styles.confirmBtn}
                        >
                          <Text style={{ color: "#fff", fontWeight: "600" }}>
                            Confirm Location
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#fff" }}>Loading map...</Text>
                    </View>
                  )}
                </SafeAreaView>
              </Modal>
            </View>

            {/* Due Date & Time Row */}
            <View style={[styles.fieldBlock, styles.row]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Due Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowDatePicker(true);
                    hideAllSuggestions();
                  }}
                  style={[styles.input, styles.tallerInput]}
                >
                  <Text style={{ color: "#fff" }}>
                    {dueDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "calendar"}
                    value={dueDate}
                    onChange={(event, d) => {
                      setShowDatePicker(false);
                      if (d) setDueDate(d);
                    }}
                  />
                )}
              </View>

              <View style={{ width: 120 }}>
                <Text style={styles.label}>Time</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowTimePicker(true);
                    hideAllSuggestions();
                  }}
                  style={[styles.input, styles.tallerInput]}
                >
                  <Text
                    style={{ color: "#fff" }}
                  >{`${hour}:${minute} ${ampm}`}</Text>
                </TouchableOpacity>

                {showTimePicker && (
                  <DateTimePicker
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "clock"}
                    value={(() => {
                      const d = new Date();
                      let h = parseInt(hour, 10);
                      if (ampm === "PM" && h < 12) h += 12;
                      if (ampm === "AM" && h === 12) h = 0;
                      d.setHours(h, parseInt(minute, 10) || 0, 0, 0);
                      return d;
                    })()}
                    onChange={(event, selectedDate) => {
                      setShowTimePicker(false);
                      if (!selectedDate) return;
                      let hh = selectedDate.getHours();
                      const mm = selectedDate.getMinutes();
                      setAmpm(hh >= 12 ? "PM" : "AM");
                      hh = hh % 12;
                      if (hh === 0) hh = 12;
                      setHour(String(hh).padStart(2, "0"));
                      setMinute(String(mm).padStart(2, "0"));
                    }}
                  />
                )}
              </View>
            </View>

            {/* Priority & Recurring Row */}
            <View style={[styles.fieldBlock, styles.row]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Priority</Text>
                <TouchableOpacity
                  style={[styles.input, styles.tallerInput]}
                  onPress={() => {
                    setShowPriorityDropdown((v) => !v);
                    hideAllSuggestions();
                  }}
                >
                  <Text style={{ color: "#fff" }}>
                    {priority === "low"
                      ? "Low"
                      : priority === "medium"
                      ? "Medium"
                      : "High"}
                  </Text>
                </TouchableOpacity>
                {showPriorityDropdown && (
                  <View style={styles.smallDropdown}>
                    {[
                      { label: "Low", value: "low" },
                      { label: "Medium", value: "medium" },
                      { label: "High", value: "high" },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setPriority(item.value as Priority);
                          setShowPriorityDropdown(false);
                        }}
                      >
                        <Text style={{ color: "#fff" }}>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Recurring</Text>
                <TouchableOpacity
                  style={[styles.input, styles.tallerInput]}
                  onPress={() => {
                    setShowRecurringDropdown((v) => !v);
                    hideAllSuggestions();
                  }}
                >
                  <Text style={{ color: "#fff" }}>
                    {recurring === "none"
                      ? "None"
                      : recurring === "daily"
                      ? "Daily"
                      : "Weekly"}
                  </Text>
                </TouchableOpacity>
                {showRecurringDropdown && (
                  <View style={styles.smallDropdown}>
                    {[
                      { label: "None", value: "none" },
                      { label: "Daily", value: "daily" },
                      { label: "Weekly", value: "weekly" },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setRecurring(item.value as Recurring);
                          setShowRecurringDropdown(false);
                        }}
                      >
                        <Text style={{ color: "#fff" }}>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                }}
                style={[styles.btn, styles.btnOutline]}
                disabled={submitting}
              >
                <Text style={[styles.btnTxt, styles.btnOutlineTxt]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                style={styles.btn}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnTxt}>
                    {initialTask ? "Save" : "Create Task"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default NewTaskSheet;

// -------------------- Styles --------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1020" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#fff" },
  subtitle: {
    fontSize: 16,
    color: "#aaa",
    marginTop: 4,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  closeBtn: { padding: 8 },
  closeTxt: { color: "#999", fontSize: 18, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 60 },
  fieldBlock: { marginVertical: 8 },
  label: { color: "#fff", fontSize: 14, marginBottom: 6 },
  input: {
    backgroundColor: "#1c2238",
    borderRadius: 10,
    paddingHorizontal: 12,
    color: "#fff",
  },
  tallerInput: { paddingVertical: 14 }, // increased height for inputs (except description)
  inputWrap: { position: "relative" },
  loadingIcon: { position: "absolute", right: 10, top: 14 },
  suggPanel: {
    backgroundColor: "#1c2238",
    borderRadius: 8,
    marginTop: 6,
    overflow: "hidden",
  },
  suggItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2b3448",
  },
  suggText: { color: "#fff" },
  multiline: { minHeight: 90, textAlignVertical: "top", paddingVertical: 12 },
  row: { flexDirection: "row", alignItems: "flex-start" },
  placeList: {
    backgroundColor: "#1c2238",
    borderRadius: 8,
    marginTop: 8,
    zIndex: 10,
    elevation: 4,
  },
  placeItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2b3448",
  },
  placeTitle: { color: "#fff", fontWeight: "600" },
  placeSubtitle: { color: "#aaa", fontSize: 12, marginTop: 4 },
  placeETA: { color: "#9ef", fontSize: 12 },
  mapBtn: {
    marginLeft: 8,
    backgroundColor: "#1c2238",
    padding: 10,
    borderRadius: 10,
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  mapIcon: { width: 36, height: 36 },
  chosenLoc: { marginTop: 8, color: "#ccc" },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 40,
  },
  btn: {
    flex: 1,
    backgroundColor: "#3b82f6",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 4,
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "600" },
  btnOutlineTxt: { color: "#3b82f6" },
  map: { height: 300, width: "100%" }, // map reduced to partial height (like screenshot)
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#0b1020",
  },
  mapFooter: { padding: 20, backgroundColor: "#0b1020" },
  confirmBtn: {
    backgroundColor: "#3b82f6",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  smallDropdown: {
    backgroundColor: "#1c2238",
    borderRadius: 8,
    marginTop: 8,
    overflow: "hidden",
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
  },
});
