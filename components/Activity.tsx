import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { ArrowLeft, CheckCircle, Clock, MapPin } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

type Props = {
  onBack: () => void;
};
export default function Activity({ onBack }: Props) {
  const navigation = useNavigation();

  const recentActivity = [
    { icon: <CheckCircle color="#4a6dff" size={18} />, text: "Task 'Buy groceries' marked as completed." },
    { icon: <Clock color="#ffc107" size={18} />, text: "Reminder set for 'Meeting with Alex'." },
    { icon: <MapPin color="#00c853" size={18} />, text: "Navigated to 'Gym' location." },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      <ScrollView>
        {recentActivity.map((item, i) => (
          <View key={i} style={styles.activityItem}>
            {item.icon}
            <Text style={styles.activityText}>{item.text}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1020", padding: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700", marginLeft: 12 },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a2035",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  activityText: { color: "#fff", marginLeft: 10, flex: 1, fontSize: 15 },
});
