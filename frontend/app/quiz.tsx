import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
}

interface QuizData {
  questions: QuizQuestion[];
  title: string;
  id: string;
  isCompleted?: boolean;
  score?: number;
  totalQuestions?: number;
  userAnswers?: number[];
}

export default function QuizScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams();
  const dataString = Array.isArray(data) ? data[0] : data;

  let quizData: QuizData | null = null;

  try {
    const parsedData = JSON.parse(decodeURIComponent(dataString || "{}"));

    if (parsedData.questions && Array.isArray(parsedData.questions)) {
      quizData = parsedData;
    } else if (
      parsedData.quiz_questions &&
      Array.isArray(parsedData.quiz_questions)
    ) {
      quizData = {
        questions: parsedData.quiz_questions,
        title: parsedData.title || "Generated Quiz",
        id: parsedData.id || "temp_quiz",
        isCompleted: parsedData.isCompleted || false,
        score: parsedData.score,
        totalQuestions: parsedData.totalQuestions,
        userAnswers: parsedData.userAnswers || [],
      };
    }
  } catch (error) {
    console.error("Error parsing quiz data:", error);
  }

  // Initialize state based on quiz data
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>(
    quizData?.userAnswers || []
  );
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(
    quizData?.isCompleted || false
  );
  const [finalScore, setFinalScore] = useState(quizData?.score || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      setCurrentIndex(newIndex);

      // Restore previous answer state if user has already answered this question
      const previousAnswer = userAnswers[newIndex];
      if (previousAnswer !== undefined) {
        setSelectedAnswer(previousAnswer);
        setShowFeedback(true);
        const correctAnswer = quizData!.questions[newIndex].correct_answer;
        setIsCorrect(previousAnswer === correctAnswer);
        // Reset animation values for previous answers
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
      } else {
        setSelectedAnswer(null);
        setShowFeedback(false);
        fadeAnim.setValue(0);
        scaleAnim.setValue(1);
      }
    }
  });

  const handleAnswerSelect = (optionIndex: number) => {
    // Don't allow selecting answers if quiz is completed or if this question was already answered in a completed quiz
    if (
      quizCompleted ||
      (quizData?.isCompleted && userAnswers[currentIndex] !== undefined)
    )
      return;
    if (showFeedback) return; // Don't allow changing answer after selection

    setSelectedAnswer(optionIndex);
    const correctAnswer = quizData!.questions[currentIndex].correct_answer;
    const correct = optionIndex === correctAnswer;

    setIsCorrect(correct);
    setShowFeedback(true);

    // Update user answers array
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = optionIndex;
    setUserAnswers(newAnswers);

    // Animate feedback
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: correct ? 1.1 : 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto advance after delay (only if not completed quiz)
    if (!quizData?.isCompleted) {
      setTimeout(() => {
        if (currentIndex === quizData!.questions.length - 1) {
          // Quiz completed
          calculateFinalScore(newAnswers);
        }
      }, 1500);
    }
  };
  const calculateFinalScore = async (answers: number[]) => {
    if (!quizData) return;

    let correctCount = 0;
    answers.forEach((answer, index) => {
      if (answer === quizData.questions[index].correct_answer) {
        correctCount++;
      }
    });

    const score = correctCount;
    setFinalScore(score);
    setQuizCompleted(true);

    // Submit score to backend
    try {
      setIsSubmitting(true);
      const userId = await AsyncStorage.getItem("userId");

      if (userId && quizData.id !== "temp_quiz") {
        const response = await fetch("http://127.0.0.1:8000/api/submitQuiz", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            quizId: quizData.id,
            userAnswers: answers,
            score: score,
          }),
        });

        if (response.ok) {
          console.log("Quiz score submitted successfully");
        }
      }
    } catch (error) {
      console.error("Error submitting quiz score:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOptionStyle = (optionIndex: number) => {
    if (!showFeedback) {
      return selectedAnswer === optionIndex
        ? styles.optionSelected
        : styles.option;
    }

    const correctAnswer = quizData!.questions[currentIndex].correct_answer;

    if (optionIndex === correctAnswer) {
      return styles.optionCorrect;
    } else if (
      optionIndex === selectedAnswer &&
      optionIndex !== correctAnswer
    ) {
      return styles.optionIncorrect;
    } else {
      return styles.optionDisabled;
    }
  };

  const getOptionIcon = (optionIndex: number) => {
    if (!showFeedback) return null;

    const correctAnswer = quizData!.questions[currentIndex].correct_answer;

    if (optionIndex === correctAnswer) {
      return <Ionicons name="checkmark-circle" size={24} color="#10b981" />;
    } else if (
      optionIndex === selectedAnswer &&
      optionIndex !== correctAnswer
    ) {
      return <Ionicons name="close-circle" size={24} color="#ef4444" />;
    }
    return null;
  };

  const renderQuestion = ({
    item,
    index,
  }: {
    item: QuizQuestion;
    index: number;
  }) => {
    return (
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cardContent}
          >
            <Text style={styles.questionNumber}>
              Question {index + 1} of {quizData!.questions.length}
            </Text>

            <Text style={styles.questionText}>{item.question}</Text>

            <View style={styles.optionsContainer}>
              {item.options.map((option, optionIndex) => (
                <TouchableOpacity
                  key={optionIndex}
                  style={getOptionStyle(optionIndex)}
                  onPress={() => handleAnswerSelect(optionIndex)}
                  disabled={
                    showFeedback ||
                    quizCompleted ||
                    (quizData?.isCompleted &&
                      userAnswers[currentIndex] !== undefined)
                  }
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLetter}>
                      {String.fromCharCode(65 + optionIndex)}
                    </Text>
                    <Text style={styles.optionText}>{option}</Text>
                    {getOptionIcon(optionIndex)}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {showFeedback && (
              <Animated.View
                style={[
                  styles.feedbackContainer,
                  { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
                ]}
              >
                <Ionicons
                  name={isCorrect ? "checkmark-circle" : "close-circle"}
                  size={48}
                  color={isCorrect ? "#10b981" : "#ef4444"}
                />
                <Text
                  style={[
                    styles.feedbackText,
                    { color: isCorrect ? "#10b981" : "#ef4444" },
                  ]}
                >
                  {isCorrect ? "Correct!" : "Incorrect!"}
                </Text>
              </Animated.View>
            )}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderScoreCard = () => {
    const percentage = Math.round(
      (finalScore / quizData!.questions.length) * 100
    );

    return (
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <View style={styles.scoreContainer}>
            <Ionicons name="trophy" size={64} color="#f59e0b" />
            <Text style={styles.scoreTitle}>Quiz Completed!</Text>
            <Text style={styles.scoreText}>
              {finalScore}/{quizData!.questions.length}
            </Text>
            <Text style={styles.percentageText}>{percentage}% Correct</Text>

            {isSubmitting && (
              <Text style={styles.submittingText}>Saving score...</Text>
            )}

            <TouchableOpacity
              style={styles.finishButton}
              onPress={() => router.back()}
            >
              <Text style={styles.finishButtonText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (!quizData || quizData.questions.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.emptyContainer}>
          <Ionicons name="help-circle-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No quiz questions</Text>
          <Text style={styles.emptyText}>
            Upload an image with text to generate a quiz.
          </Text>
        </View>
      </View>
    );
  }

  const allQuestions = [...quizData.questions];
  if (quizCompleted) {
    allQuestions.push({} as QuizQuestion); // Add score card
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quiz</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={allQuestions}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) => {
          if (index === quizData.questions.length) {
            return renderScoreCard();
          }
          return renderQuestion({ item, index });
        }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        contentContainerStyle={{ alignItems: "center" }}
        scrollEnabled={showFeedback || quizCompleted || quizData?.isCompleted}
      />

      {!quizCompleted && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {currentIndex + 1} / {quizData.questions.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  headerRight: {
    width: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  cardContainer: {
    width,
    height: height * 0.65,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: width * 0.9,
    height: height * 0.55,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  cardContent: {
    flexGrow: 1,
  },
  questionNumber: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    textAlign: "center",
  },
  questionText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 24,
    lineHeight: 30,
  },
  optionsContainer: {
    flex: 1,
  },
  option: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    marginBottom: 12,
    padding: 16,
  },
  optionSelected: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#6366f1",
    backgroundColor: "#eef2ff",
    marginBottom: 12,
    padding: 16,
  },
  optionCorrect: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#10b981",
    backgroundColor: "#ecfdf5",
    marginBottom: 12,
    padding: 16,
  },
  optionIncorrect: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
    marginBottom: 12,
    padding: 16,
  },
  optionDisabled: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    marginBottom: 12,
    padding: 16,
    opacity: 0.6,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  feedbackContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },
  scoreContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: "800",
    color: "#6366f1",
    marginBottom: 8,
  },
  percentageText: {
    fontSize: 20,
    color: "#6b7280",
    marginBottom: 32,
  },
  submittingText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    fontStyle: "italic",
  },
  finishButton: {
    backgroundColor: "#6366f1",
    borderRadius: 25,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  finishButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    backgroundColor: "#6366f1",
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  footerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
