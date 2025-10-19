// app/interests.tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Animated,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HIGH_SCHOOL_TOPICS = [
  "Mathematics",
  "Biology",
  "Chemistry",
  "Physics",
  "History",
  "Geography",
  "Computer Science",
  "Art & Design",
  "English Literature",
  "Environmental Science",
];

const COLLEGE_TOPICS = {
  CS: [
    "Machine Learning",
    "AI",
    "Web Dev",
    "Data Structures",
    "Cloud",
    "Cybersecurity",
  ],
  Business: [
    "Finance",
    "Marketing",
    "Entrepreneurship",
    "Economics",
    "Analytics",
  ],
  Biology: ["Genetics", "Neuroscience", "Biochemistry", "Immunology"],
  Default: ["Psychology", "Philosophy", "Design Thinking", "Engineering"],
};

export default function InterestsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; password: string }>();
  const { email, password } = params;

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [educationLevel, setEducationLevel] = useState<
    "High School" | "Undergraduate" | "Graduate" | null
  >(null);
  const [grade, setGrade] = useState("");
  const [major, setMajor] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(false);

  const startAnimation = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const getTopics = () => {
    if (educationLevel === "High School") return HIGH_SCHOOL_TOPICS;
    if (major.toLowerCase().includes("cs")) return COLLEGE_TOPICS.CS;
    if (major.toLowerCase().includes("business"))
      return COLLEGE_TOPICS.Business;
    if (major.toLowerCase().includes("bio")) return COLLEGE_TOPICS.Biology;
    return COLLEGE_TOPICS.Default;
  };

  const toggleTopic = (topic: string) => {
    if (selected.includes(topic)) {
      setSelected(selected.filter((t) => t !== topic));
    } else if (selected.length < 5) {
      setSelected([...selected, topic]);
    } else {
      Alert.alert("Limit Reached", "You can select up to 5 topics.");
    }
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
      if (selected.length < 5) {
        Alert.alert("Select 5 topics", "Please select exactly 5 interests to continue.");
        return;
      }

      try {
        setLoading(true);

        // Create user with Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log("✅ Firebase signup success:", user.uid);

        // Update user profile with name
        await updateProfile(user, {
          displayName: name,
        });

        // Store user ID in AsyncStorage
        await AsyncStorage.setItem("userId", user.uid);
        console.log("✅ Stored userId:", user.uid);

        setStep(3);
        startAnimation();
      } catch (error: any) {
        console.error("Signup error:", error);

        let errorMessage = error.message || "Something went wrong";

        if (error.code === "auth/email-already-in-use") {
          errorMessage = "An account with this email already exists";
        } else if (error.code === "auth/invalid-email") {
          errorMessage = "Invalid email address";
        } else if (error.code === "auth/weak-password") {
          errorMessage = "Password should be at least 6 characters";
        }

        Alert.alert("Signup Failed", errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      router.replace("/chat");
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

      {/* STEP 2 — Select Interests */}
      {step === 2 && (
        <View style={{ flex: 1 }}>
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="bulb-outline" size={48} color="#6366f1" />
            </View>
            <Text style={styles.title}>Choose your interests</Text>
            <Text style={styles.subtitle}>
              Pick exactly 5 topics you'd like to learn about
            </Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(selected.length / 5) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {selected.length} / 5 selected
              </Text>
            </View>
          </View>

          <FlatList
            data={getTopics()}
            numColumns={2}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.topicButton,
                  selected.includes(item) && styles.topicSelected,
                ]}
                onPress={() => toggleTopic(item)}
                activeOpacity={0.7}
              >
                {selected.includes(item) && (
                  <View style={styles.checkmarkBadge}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
                <Text
                  style={[
                    styles.topicText,
                    selected.includes(item) && styles.topicTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity
            style={[
              styles.continueButton,
              selected.length < 5 && styles.continueButtonDisabled,
            ]}
            disabled={selected.length < 5 || loading}
            onPress={nextStep}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>
              {loading ? "Creating Account..." : "Continue"}
            </Text>
            {!loading && (
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            )}
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
            You're ready to start your personalized learning journey
          </Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={nextStep}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>Start Learning</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 24,
    paddingTop: 60,
  },
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
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 24,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 24,
  },
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
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
    marginTop: 8,
  },
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
  optionSelected: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  optionContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  optionText: { color: "#374151", fontSize: 16, fontWeight: "500" },
  optionTextSelected: { color: "#fff", fontWeight: "600" },
  progressContainer: { width: "100%", alignItems: "center", marginTop: 8 },
  progressBar: {
    width: "80%",
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", backgroundColor: "#6366f1", borderRadius: 4 },
  progressText: { fontSize: 14, fontWeight: "600", color: "#6366f1" },
  list: { paddingHorizontal: 8, paddingTop: 8 },
  topicButton: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    margin: 6,
    backgroundColor: "#fff",
    minWidth: 140,
    alignItems: "center",
  },
  topicSelected: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  checkmarkBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  topicText: { color: "#374151", fontSize: 15, fontWeight: "600" },
  topicTextSelected: { color: "#fff", fontWeight: "700" },
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
  continueButtonDisabled: { backgroundColor: "#9ca3af" },
  continueText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  successIconContainer: { marginBottom: 24 },
  successTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  successText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#6b7280",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 26,
  },
});
