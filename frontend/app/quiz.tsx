import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";

interface QuizQuestion {
  question: string;
  options?: string[];
  correct?: string;
}

export default function QuizScreen() {
  const { data } = useLocalSearchParams();
  const dataString = Array.isArray(data) ? data[0] : data;
  const quiz: QuizQuestion[] = JSON.parse(
    decodeURIComponent(dataString || "[]")
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📝 Generated Quiz</Text>
      {quiz.map((q: QuizQuestion, i: number) => (
        <View key={i} style={styles.questionCard}>
          <Text style={styles.question}>
            {i + 1}. {q.question}
          </Text>
          {q.options?.map((opt: string, j: number) => (
            <Text key={j} style={styles.option}>
              {String.fromCharCode(65 + j)}. {opt}
            </Text>
          ))}
          {q.correct && (
            <Text style={styles.correct}>✅ Correct: {q.correct}</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f9fafb" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  questionCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  question: { fontWeight: "600", fontSize: 16, color: "#111827" },
  option: { fontSize: 15, color: "#374151", marginTop: 4 },
  correct: { marginTop: 8, color: "#16a34a", fontWeight: "600" },
});
