import React from "react";
import { View, Text, ScrollView, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { Card, Button, Provider as PaperProvider } from "react-native-paper";
import { MapPin, Navigation, Zap, BrainCircuit, Star } from "lucide-react-native";

function HomePageContent() {
  return (
    <LinearGradient
      colors={["#6b46c1", "#0ea5e9", "#ffffff"]}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>G-Remind</Text>
          <View style={styles.nav}>
            <Link href="/login" asChild>
              <Button mode="text">Log In</Button>
            </Link>
            <Link href="/signup" asChild>
              <Button mode="contained">Sign Up</Button>
            </Link>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.section}>
          <Text style={styles.heroTitle}>
            Never forget a task at a location again.
          </Text>
          <Text style={styles.heroSubtitle}>
            G-Remind is your intelligent assistant for location-based tasks. Set
            reminders for places, and get notified when you're nearby.
          </Text>
          <Link href="/login" asChild>
            <Button mode="contained" style={{ marginTop: 16 }}>
              Get Started for Free
            </Button>
          </Link>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            A smarter way to manage your errands
          </Text>
          <View style={styles.grid}>
            <FeatureCard
              icon={<MapPin color="#6b46c1" size={32} />}
              title="Location-Based Tasks"
              description="Create tasks and link them to specific locations. Get reminders when you're in the vicinity."
            />
            <FeatureCard
              icon={<BrainCircuit color="#6b46c1" size={32} />}
              title="AI Location Suggestions"
              description="Start typing and our AI will suggest relevant locations, making task creation faster."
            />
            <FeatureCard
              icon={<Navigation color="#6b46c1" size={32} />}
              title="Multi-Stop Navigation"
              description="Plan your route efficiently with optimized multi-stop routing."
            />
            <FeatureCard
              icon={<Zap color="#6b46c1" size={32} />}
              title="Smart Task Management"
              description="Organize tasks with categories, due dates, and priorities."
            />
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.grid}>
            <HowItWorksStep
              step="1"
              title="Create Your Task"
              description="Quickly add a task with AI-powered suggestions."
            />
            <HowItWorksStep
              step="2"
              title="Tag a Location"
              description="Link your task to a specific place."
            />
            <HowItWorksStep
              step="3"
              title="Get Smart Reminders"
              description="Receive a notification right when you arrive."
            />
          </View>
        </View>

        {/* App Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Designed for life on the go</Text>
          <Image
            source={{ uri: "https://placehold.co/600x400.png" }}
            style={styles.image}
          />
          <Image
            source={{ uri: "https://placehold.co/600x400.png" }}
            style={styles.image}
          />
          <Text style={styles.paragraph}>
            G-Remind’s clean, intuitive interface helps you manage location-based
            tasks without clutter.
          </Text>
        </View>

        {/* Testimonials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loved by users everywhere</Text>
          <View style={styles.grid}>
            <TestimonialCard
              quote="I used to forget dry cleaning. G-Remind is a lifesaver!"
              author="Sarah J."
            />
            <TestimonialCard
              quote="Multi-stop navigation plans my errands in seconds."
              author="Mike R."
            />
            <TestimonialCard
              quote="Finally, a to-do app that fits my lifestyle!"
              author="Alex D."
            />
          </View>
        </View>

        {/* CTA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Ready to take control of your tasks?
          </Text>
          <Text style={styles.paragraph}>
            Sign up for free and start organizing your life, one location at a
            time.
          </Text>
          <Link href="/login" asChild>
            <Button mode="contained" style={{ marginTop: 16 }}>
              Get Started Now
            </Button>
          </Link>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ color: "#888" }}>
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
      <Card.Content>
        <View style={{ alignItems: "center", marginBottom: 8 }}>{icon}</View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
      </Card.Content>
    </Card>
  );
}

function HowItWorksStep({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.stepNumber}>{step}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
      </Card.Content>
    </Card>
  );
}

function TestimonialCard({ quote, author }: { quote: string; author: string }) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={{ flexDirection: "row", marginBottom: 4 }}>
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={20} color="#facc15" fill="#facc15" />
          ))}
        </View>
        <Text style={{ fontStyle: "italic", marginBottom: 8 }}>
          "{quote}"
        </Text>
        <Text style={{ fontWeight: "600", textAlign: "right" }}>
          - {author}
        </Text>
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
  header: {
    height: 70,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
  },
  nav: {
    flexDirection: "row",
    gap: 8,
  },
  section: {
    padding: 24,
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  heroSubtitle: {
    marginTop: 12,
    fontSize: 16,
    textAlign: "center",
    color: "#666",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  paragraph: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginTop: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  card: {
    width: 160,
    margin: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  cardDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  stepNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#6b46c1",
    textAlign: "center",
    marginBottom: 4,
  },
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
  },
});
