// app/interests.tsx
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";

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
        Alert.alert(
          "Select 5 topics",
          "Please select exactly 5 interests to continue."
        );
        return;
      }

      // ✅ Create user only after selecting 5 interests
      try {
        setLoading(true);
        const userCred = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        console.log("✅ User signed up:", userCred.user.email);

        // Optionally store name, grade, major, interests in backend
        // await fetch("https://your-backend.com/api/profile", {...})

        setStep(3);
        startAnimation();
      } catch (error: any) {
        console.error("Signup error:", error);
        Alert.alert("Signup Failed", error.message);
      } finally {
        setLoading(false);
      }
    } else {
      router.replace("/chat");
    }
  };

  return (
    <View style={styles.container}>
      {step === 1 && (
        <View>
          <Text style={styles.title}>Let’s get to know you 👋</Text>
          <Text style={styles.subtitle}>
            This helps us personalize your feed.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Your Name"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Education Level</Text>
          {["High School", "Undergraduate", "Graduate"].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.optionButton,
                educationLevel === level && styles.optionSelected,
              ]}
              onPress={() => setEducationLevel(level as any)}
            >
              <Text
                style={[
                  styles.optionText,
                  educationLevel === level && styles.optionTextSelected,
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}

          {educationLevel === "High School" && (
            <TextInput
              style={styles.input}
              placeholder="Enter your grade (1st - 12th)"
              value={grade}
              onChangeText={setGrade}
            />
          )}

          {educationLevel && educationLevel !== "High School" && (
            <TextInput
              style={styles.input}
              placeholder="Enter your major (e.g. Computer Science)"
              value={major}
              onChangeText={setMajor}
            />
          )}

          <TouchableOpacity style={styles.continueButton} onPress={nextStep}>
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Choose your interests 🎯</Text>
          <Text style={styles.subtitle}>
            Pick exactly 5 topics you’d like to learn about.
          </Text>

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
              >
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
          />

          <TouchableOpacity
            style={[
              styles.continueButton,
              selected.length < 5 && { opacity: 0.5 },
            ]}
            disabled={selected.length < 5 || loading}
            onPress={nextStep}
          >
            <Text style={styles.continueText}>
              {loading ? "Creating Account..." : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 3 && (
        <Animated.View style={[styles.successContainer, { opacity: fadeAnim }]}>
          <Text style={styles.successText}>
            You’re all set to gain knowledge! 🚀
          </Text>
          <TouchableOpacity style={styles.continueButton} onPress={nextStep}>
            <Text style={styles.continueText}>Go to Chat</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24, paddingTop: 60 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: "#6b7280", marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  optionButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  optionSelected: { backgroundColor: "#6366f1", borderColor: "#6366f1" },
  optionText: { color: "#374151", fontSize: 16 },
  optionTextSelected: { color: "#fff" },
  list: { alignItems: "center" },
  topicButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    margin: 6,
  },
  topicSelected: { backgroundColor: "#6366f1", borderColor: "#6366f1" },
  topicText: { color: "#374151", fontSize: 14, fontWeight: "500" },
  topicTextSelected: { color: "#fff" },
  continueButton: {
    backgroundColor: "#6366f1",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  continueText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  successText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginVertical: 20,
    textAlign: "center",
  },
});
