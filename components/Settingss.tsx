import React, { useState } from "react";
import { View, Text, Switch, StyleSheet, TouchableOpacity, Alert, Linking } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

type Props = {
  onBack?: () => void;
};
export default function Settingss({ onBack }: Props) {
  const navigation = useNavigation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  // Interactive settings state
  const [sound, setSound] = useState<"Chime" | "Bell" | "Beep">("Chime");
  const [quietHours, setQuietHours] = useState<"Off" | "10:00 PM - 7:00 AM">("10:00 PM - 7:00 AM");
  const [snoozeDuration, setSnoozeDuration] = useState<5 | 10 | 15>(10);
  const [defaultReminderTime, setDefaultReminderTime] = useState<"7:00 AM" | "8:00 AM" | "9:00 AM">("9:00 AM");
  const [calendarIntegration, setCalendarIntegration] = useState<boolean>(false);
  const [cloudBackup, setCloudBackup] = useState<"Manual" | "Auto">("Manual");
  const [importFormat, setImportFormat] = useState<"JSON" | "CSV">("JSON");
  const [exportFormat, setExportFormat] = useState<"CSV" | "JSON">("CSV");
  const [language, setLanguage] = useState<"English" | "Spanish" | "French">("English");
  const [timezone, setTimezone] = useState<"Automatic" | "Manual">("Automatic");
  const [appIconBadge, setAppIconBadge] = useState<boolean>(true);
  const [weeklySummary, setWeeklySummary] = useState<"Monday" | "Friday" | "Sunday">("Monday");
  const [biometricLock, setBiometricLock] = useState<boolean>(false);
  const [usageAnalytics, setUsageAnalytics] = useState<"Opt-in" | "Opt-out">("Opt-in");
  const [crashReports, setCrashReports] = useState<"Enabled" | "Disabled">("Enabled");
  const [dataSaver, setDataSaver] = useState<boolean>(false);
  const [reduceMotionState, setReduceMotionState] = useState<boolean>(false);

  const cycle = <T,>(arr: T[], current: T): T => arr[(arr.indexOf(current) + 1) % arr.length];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (onBack ? onBack() : navigation.goBack())}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Enable Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ true: "#4a6dff", false: "#555" }}
          />
        </View>

        <TouchableOpacity style={styles.row} onPress={() => setSound(cycle(["Chime", "Bell", "Beep"], sound))}>
          <Text style={styles.label}>Reminder Sound</Text>
          <Text style={{ color: "#9aa0b7" }}>{sound}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => setQuietHours(quietHours === "Off" ? "10:00 PM - 7:00 AM" : "Off")}>
          <Text style={styles.label}>Quiet Hours</Text>
          <Text style={{ color: "#9aa0b7" }}>{quietHours}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => setSnoozeDuration(cycle([5, 10, 15], snoozeDuration) as 5 | 10 | 15)}
        >
          <Text style={styles.label}>Snooze Duration</Text>
          <Text style={{ color: "#9aa0b7" }}>{snoozeDuration} min</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => setDefaultReminderTime(cycle(["7:00 AM", "8:00 AM", "9:00 AM"], defaultReminderTime))}
        >
          <Text style={styles.label}>Default Reminder Time</Text>
          <Text style={{ color: "#9aa0b7" }}>{defaultReminderTime}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => setCalendarIntegration(!calendarIntegration)}>
          <Text style={styles.label}>Calendar Integration</Text>
          <Text style={{ color: "#9aa0b7" }}>{calendarIntegration ? "On" : "Off"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => setCloudBackup(cloudBackup === "Manual" ? "Auto" : "Manual")}>
          <Text style={styles.label}>Cloud Backup</Text>
          <Text style={{ color: "#9aa0b7" }}>{cloudBackup}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => setImportFormat(importFormat === "JSON" ? "CSV" : "JSON")}>
          <Text style={styles.label}>Import Data</Text>
          <Text style={{ color: "#9aa0b7" }}>{importFormat}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => setExportFormat(exportFormat === "CSV" ? "JSON" : "CSV")}>
          <Text style={styles.label}>Export Data</Text>
          <Text style={{ color: "#9aa0b7" }}>{exportFormat}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => setLanguage(cycle(["English", "Spanish", "French"], language))}
        >
          <Text style={styles.label}>Language</Text>
          <Text style={{ color: "#9aa0b7" }}>{language}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => setTimezone(timezone === "Automatic" ? "Manual" : "Automatic")}>
          <Text style={styles.label}>Timezone</Text>
          <Text style={{ color: "#9aa0b7" }}>{timezone}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => setAppIconBadge(!appIconBadge)}>
          <Text style={styles.label}>App Icon Badge</Text>
          <Text style={{ color: "#9aa0b7" }}>{appIconBadge ? "On" : "Off"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => setWeeklySummary(cycle(["Monday", "Friday", "Sunday"], weeklySummary))}
        >
          <Text style={styles.label}>Weekly Summary</Text>
          <Text style={{ color: "#9aa0b7" }}>{weeklySummary}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => setBiometricLock(!biometricLock)}>
          <Text style={styles.label}>Biometric Lock</Text>
          <Text style={{ color: "#9aa0b7" }}>{biometricLock ? "On" : "Off"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => Alert.alert("Privacy", "Manage privacy settings from here.")}
        >
          <Text style={styles.label}>Privacy</Text>
          <Text style={{ color: "#9aa0b7" }}>Manage</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => setUsageAnalytics(usageAnalytics === "Opt-in" ? "Opt-out" : "Opt-in")}
        >
          <Text style={styles.label}>Usage Analytics</Text>
          <Text style={{ color: "#9aa0b7" }}>{usageAnalytics}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => setCrashReports(crashReports === "Enabled" ? "Disabled" : "Enabled")}
        >
          <Text style={styles.label}>Crash Reports</Text>
          <Text style={{ color: "#9aa0b7" }}>{crashReports}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => setDataSaver(!dataSaver)}>
          <Text style={styles.label}>Data Saver</Text>
          <Text style={{ color: "#9aa0b7" }}>{dataSaver ? "On" : "Off"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => setReduceMotionState(!reduceMotionState)}>
          <Text style={styles.label}>Reduce Motion</Text>
          <Text style={{ color: "#9aa0b7" }}>{reduceMotionState ? "On" : "Off"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={async () => {
            try {
              await Linking.openURL("https://example.com/faq");
            } catch {
              Alert.alert("Help & Support", "Unable to open FAQ right now.");
            }
          }}
        >
          <Text style={styles.label}>Help & Support</Text>
          <Text style={{ color: "#9aa0b7" }}>FAQ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => Alert.alert("About", "G-Remind v1.0.0")}
        >
          <Text style={styles.label}>About</Text>
          <Text style={{ color: "#9aa0b7" }}>v1.0.0</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <Text style={styles.label}>Dark Mode</Text>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ true: "#4a6dff", false: "#555" }}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={() => Alert.alert("Settings saved", "Your preferences have been saved.")}
      >
        <Text style={styles.saveTxt}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1020", padding: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700", marginLeft: 12 },
  section: { backgroundColor: "#1a2035", borderRadius: 12, padding: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  label: { color: "#fff", fontSize: 16 },
  saveBtn: { marginTop: 30, backgroundColor: "#4a6dff", padding: 14, borderRadius: 10 },
  saveTxt: { color: "#fff", fontWeight: "700", textAlign: "center" },
});
