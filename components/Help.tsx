import { ArrowLeft, Mail, Phone } from "lucide-react-native";
import React from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// import { Link } from "expo-router";
import { useNavigation } from "@react-navigation/native";

type Props = {
  onBack?: () => void;
};

export default function Help({ onBack }: Props) {
  const navigation = useNavigation<any>();

  const faqs = [
    {
      q: "How do I add a new task?",
      a: "Tap the '+' button on the main screen to create a new task and set reminders.",
    },
    {
      q: "How do I enable navigation for tasks?",
      a: "Allow location permissions and use the 'Start' button or task navigation icon.",
    },
    {
      q: "How do I reschedule a task?",
      a: "Use the 'AI Reschedule' option on any task card to get automatic suggestions.",
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (onBack ? onBack() : navigation.goBack())}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help / FAQ</Text>
      </View>

      <ScrollView>
        {faqs.map((item, index) => (
          <View key={index} style={styles.faqItem}>
            <Text style={styles.question}>{item.q}</Text>
            <Text style={styles.answer}>{item.a}</Text>
          </View>
        ))}

        <View style={styles.contactContainer}>
          <Text style={styles.contactTitle}>Contact G-Remind</Text>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL("tel:6363609736")}
          >
            <Phone color="#9aa1ff" size={20} />
            <Text style={styles.contactText}>6363609736</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL("mailto:gremind@gmail.com")}
          >
            <Mail color="#9aa1ff" size={20} />
            <Text style={styles.contactText}>gremind@gmail.com</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1020", padding: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700", marginLeft: 12 },
  faqItem: {
    backgroundColor: "#1a2035",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  question: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 6 },
  answer: { color: "#9aa1ff", fontSize: 15 },
  contactContainer: {
    backgroundColor: "#1a2035",
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  contactTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 8 },
  contactRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  contactText: { color: "#fff", fontSize: 15, marginLeft: 10 },
});
