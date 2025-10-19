import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

export default function InterestsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; password: string }>();
  
  // Ensure params are strings (not arrays)
  const email = Array.isArray(params.email) ? params.email[0] : params.email;
  const password = Array.isArray(params.password) ? params.password[0] : params.password;

  console.log("📧 Received email:", email);
  console.log("🔑 Received password:", password ? "✓ exists" : "✗ missing");

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [educationLevel, setEducationLevel] = useState<
    "High School" | "Undergraduate" | "Graduate" | null
  >(null);
  const [grade, setGrade] = useState("");
  const [major, setMajor] = useState("");
  const [topic, setTopic] = useState("");
  const [fadeAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(false);

  const startAnimation = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const nextStep = async () => {
    if (step === 1) {
      if (
        !name.trim() ||
        !educationLevel ||
        (educationLevel === "High School" && !grade) ||
        (educationLevel !== "High School" && !major.trim())
      ) {
        Alert.alert("Please complete all fields");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!topic.trim()) {
        Alert.alert("Please enter a topic");
        return;
      }

      // Now create account and generate feed after all info is collected
      try {
        setLoading(true);

        // Validate email and password
        if (!email || !password) {
          Alert.alert("Error", "Email or password is missing. Please go back and try again.");
          setLoading(false);
          return;
        }

        console.log("Attempting signup with email:", email);

        // Firebase signup
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });
        await AsyncStorage.setItem("userId", user.uid);

        const topics = [topic];
        const gradeInfo =
          educationLevel === "High School" ? `for ${grade} grade level` : `for ${major} students`;

        for (const t of topics) {
          let retryCount = 0;
          const maxRetries = 3;
          let success = false;

          while (retryCount < maxRetries && !success) {
            try {
              if (retryCount > 0) {
                console.log(`🔄 Retrying (${retryCount}/${maxRetries})...`);
              }
              console.log(`🔄 Generating feed for topic: ${t} ${gradeInfo}`);
              
              const response = await fetch(`${API_URL}/generateFeed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: `${t} ${gradeInfo}` }),
              });

              const data = await response.json();
              console.log("📦 Generate feed response:", { ok: response.ok, hasPosts: !!data.posts, postsCount: data.posts?.length });
              
              if (response.ok && data.posts && Array.isArray(data.posts) && data.posts.length > 0) {
                console.log(`💾 Saving ${data.posts.length} posts for topic: ${t}`);
                
                const saveResponse = await fetch(`${API_URL}/saveFeedPosts`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: user.uid,
                    topic: t,
                    posts: data.posts,
                    username: name,
                    isPrivate: false,
                  }),
                });
                
                const saveData = await saveResponse.json();
                console.log("✅ Save feed response:", saveData);
                success = true;
              } else {
                console.error("❌ Error generating feed for topic:", t, "Response:", data);
                retryCount++;
                if (retryCount < maxRetries) {
                  console.log(`⏳ Will retry in 2 seconds...`);
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              }
            } catch (err) {
              console.error("❌ Exception during feed generation:", err);
              retryCount++;
              if (retryCount < maxRetries) {
                console.log(`⏳ Will retry in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          }

          if (!success) {
            throw new Error(`Failed to generate feed for "${t}" after ${maxRetries} attempts. Please try again.`);
          }
        }

        setStep(3);
        startAnimation();
      } catch (error: any) {
        console.error("Signup or feed generation error:", error);
        console.log("⚠️ ERROR CODE:", error.code);
        console.log("⚠️ MESSAGE:", error.message);
        Alert.alert("Error", error.message || "Something went wrong during setup.");
      } finally {
        setLoading(false);
      }
    } else {
      router.replace("/onboarding");
    }
  };

  return (
    <View style={styles.container}>
      {/* STEP 1 — Basic Info */}
      {step === 1 && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-circle-outline" size={48} color="#6366f1" />
            </View>
            <Text style={styles.title}>Let's get to know you</Text>
            <Text style={styles.subtitle}>
              This helps us personalize your learning experience
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Education Level</Text>
            <View style={styles.optionsContainer}>
              {["High School", "Undergraduate", "Graduate"].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.optionButton,
                    educationLevel === level && styles.optionSelected,
                  ]}
                  onPress={() => setEducationLevel(level as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    <Ionicons
                      name={
                        educationLevel === level
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={20}
                      color={educationLevel === level ? "#fff" : "#6366f1"}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        educationLevel === level && styles.optionTextSelected,
                      ]}
                    >
                      {level}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {educationLevel === "High School" && (
              <Animated.View>
                <Text style={styles.label}>Grade</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 9th, 10th, 11th, 12th"
                  placeholderTextColor="#9ca3af"
                  value={grade}
                  onChangeText={setGrade}
                />
              </Animated.View>
            )}

            {educationLevel && educationLevel !== "High School" && (
              <Animated.View>
                <Text style={styles.label}>Major / Field of Study</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Computer Science"
                  placeholderTextColor="#9ca3af"
                  value={major}
                  onChangeText={setMajor}
                />
              </Animated.View>
            )}

            <TouchableOpacity
              style={styles.continueButton}
              onPress={nextStep}
              activeOpacity={0.8}
            >
              <Text style={styles.continueText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* STEP 2 — Enter Two Topics */}
      {step === 2 && (
        <View style={{ flex: 1 }}>
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="bulb-outline" size={48} color="#6366f1" />
            </View>
            <Text style={styles.title}>Tell us what interests you</Text>
            <Text style={styles.subtitle}>
              Enter a topic you'd love to learn about. We'll personalize content for your level.
            </Text>
          </View>

          <Text style={styles.label}>Topic</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Neural Networks"
            placeholderTextColor="#9ca3af"
            value={topic}
            onChangeText={setTopic}
          />

          <TouchableOpacity
            style={[styles.continueButton, loading && { backgroundColor: "#9ca3af" }]}
            onPress={nextStep}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.continueText}>
              {loading ? "Creating Feed..." : "Continue"}
            </Text>
            {!loading && <Ionicons name="arrow-forward" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 3 — Success */}
      {step === 3 && (
        <Animated.View style={[styles.successContainer, { opacity: fadeAnim }]}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#10b981" />
          </View>
          <Text style={styles.successTitle}>All Set!</Text>
          <Text style={styles.successText}>
            Your personalized learning feed is ready 🎉
          </Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={nextStep}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* 🌀 Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Creating your personalized feed...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 24, paddingTop: 60 },
  headerContainer: { alignItems: "center", marginBottom: 32 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 32, fontWeight: "bold", color: "#111827", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 16, color: "#6b7280", marginBottom: 24, textAlign: "center", paddingHorizontal: 20, lineHeight: 24 },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#f9fafb",
  },
  label: { fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 12, marginTop: 8 },
  optionsContainer: { marginBottom: 12 },
  optionButton: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  optionSelected: { backgroundColor: "#6366f1", borderColor: "#6366f1" },
  optionContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  optionText: { color: "#374151", fontSize: 16, fontWeight: "500" },
  optionTextSelected: { color: "#fff", fontWeight: "600" },
  continueButton: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  continueText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  successIconContainer: { marginBottom: 24 },
  successTitle: { fontSize: 36, fontWeight: "bold", color: "#111827", marginBottom: 12 },
  successText: { fontSize: 18, fontWeight: "500", color: "#6b7280", marginBottom: 32, textAlign: "center", lineHeight: 26 },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
});
