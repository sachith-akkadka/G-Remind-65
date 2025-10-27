import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { Card, Button, Provider as PaperProvider } from "react-native-paper";
import { MapPin, BrainCircuit, Zap } from "lucide-react-native";

function HomePageContent() {
  return (
    <LinearGradient colors={["#0b1020", "#10172a", "#1e293b"]} style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>G-Remind</Text>
          <View style={styles.nav}>
            <Link href="/login" asChild>
              <Button mode="text" textColor="#9aa1ff">Log In</Button>
            </Link>
            <Link href="/signup" asChild>
              <Button
                mode="contained"
                buttonColor="#2f7dfe"
                textColor="#fff"
              >
                Sign Up
              </Button>
            </Link>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.section}>
          <Text style={styles.heroTitle}>
            Never forget a task again.
          </Text>
          <Text style={styles.heroSubtitle}>
            Smart, location-based reminders that alert you when you're nearby.
          </Text>
          <Link href="/login" asChild>
            <Button
              mode="contained"
              buttonColor="#4a6dff"
              style={styles.startBtn}
              labelStyle={styles.startBtnTxt}
            >
              Get Started
            </Button>
          </Link>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smarter Task Management</Text>
          <View style={styles.grid}>
            <FeatureCard
              icon={<MapPin color="#4a6dff" size={28} />}
              title="Location-Based"
              description="Create reminders linked to real-world places."
            />
            <FeatureCard
              icon={<BrainCircuit color="#4a6dff" size={28} />}
              title="AI-Smart Suggestions"
              description="Auto-suggests relevant spots for your tasks."
            />
            <FeatureCard
              icon={<Zap color="#4a6dff" size={28} />}
              title="Stay Productive"
              description="Streamlined, intuitive, and built for daily use."
            />
          </View>
        </View>

        {/* App Preview */}
        <View style={styles.section}>
          <Image
            source={{ uri: "https://placehold.co/600x400/10172a/9aa1ff?text=App+Preview" }}
            style={styles.image}
          />
          <Text style={styles.paragraph}>
            Manage your errands, plan routes, and get reminders when it matters.
          </Text>
        </View>

        {/* CTA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start organizing smarter.</Text>
          <Link href="/signup" asChild>
            <Button
              mode="contained"
              buttonColor="#2f7dfe"
              style={{ marginTop: 16 }}
            >
              Create a Free Account
            </Button>
          </Link>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ color: "#9aa1ff" }}>
            © {new Date().getFullYear()} G-Remind. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

// Components
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card style={styles.card}>
      <Card.Content style={{ alignItems: "center" }}>
        {icon}
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
      </Card.Content>
    </Card>
  );
}

export default function HomeScreen() {
  return (
    <PaperProvider>
      <HomePageContent />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  // 🌙 Dark theme base
  container: { flex: 1, backgroundColor: "#0b1020" },
  header: {
    height: 70,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  nav: {
    flexDirection: "row",
    gap: 8,
  },

  // Sections
  section: { padding: 24, alignItems: "center" },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#9aa1ff",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
  },
  paragraph: {
    fontSize: 15,
    textAlign: "center",
    color: "#9aa1ff",
    marginTop: 12,
  },

  // Cards
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  card: {
    width: 160,
    margin: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginTop: 8,
    textAlign: "center",
  },
  cardDesc: {
    fontSize: 13,
    color: "#9aa1ff",
    textAlign: "center",
    marginTop: 4,
  },

  // Buttons
  startBtn: {
    marginTop: 16,
    backgroundColor: "#2f7dfe",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  startBtnTxt: { color: "#fff", fontWeight: "700" },

  // Images & Footer
  image: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
    marginTop: 12,
    borderRadius: 12,
  },
  footer: {
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },

  // Reuse of your dark style theme tokens (for expansion)
  tabTxt: { color: "#9aa1ff", fontWeight: "600" },
  tabTxtActive: { color: "#fff" },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 22,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#4a6dff",
    alignItems: "center",
    justifyContent: "center",
    elevation: Platform.OS === "android" ? 6 : 0,
  },
  fabTxt: { color: "#fff", fontSize: 32, lineHeight: 34 },
});
