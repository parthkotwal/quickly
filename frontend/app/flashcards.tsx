import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

interface Flashcard {
  topic: string;
  explanation: string;
}

export default function FlashcardsScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams();
  const dataString = Array.isArray(data) ? data[0] : data;

  let flashcards: Flashcard[] = [];

  try {
    const rawFlashcards: any = JSON.parse(
      decodeURIComponent(dataString || "[]")
    );
    console.log("Raw flashcards data:", rawFlashcards);

    // Extract flashcards from nested structure
    if (Array.isArray(rawFlashcards) && rawFlashcards.length > 0) {
      const firstItem = rawFlashcards[0];

      // Check if the explanation contains the actual flashcard data
      if (firstItem.explanation && typeof firstItem.explanation === "string") {
        const text = firstItem.explanation;

        // Try to extract JSON array from the explanation string
        const jsonMatch = text.match(/\[\s*\{[\s\S]*?"topic"[\s\S]*?\}\s*\]/);

        if (jsonMatch) {
          try {
            // Parse the extracted array
            const extractedCards = JSON.parse(jsonMatch[0]);
            flashcards = extractedCards.map((card: any) => ({
              topic: cleanText(card.topic || "No Topic"),
              explanation: cleanText(card.explanation || "No explanation"),
            }));
          } catch (e) {
            console.error("Failed to parse extracted flashcards:", e);
          }
        }

        // Fallback: extract from plain text format (topic: ..., explanation: ...)
        if (flashcards.length === 0) {
          const regex =
            /\{\s*\\?"?topic\\?"?:\s*\\?"([^"\\]+)\\?",?\s*\\?"?explanation\\?"?:\s*\\?"([^"\\]+)\\?"\s*\}/g;
          let match;
          while ((match = regex.exec(text)) !== null) {
            flashcards.push({
              topic: cleanText(match[1]),
              explanation: cleanText(match[2]),
            });
          }
        }

        // Last resort: split by common patterns
        if (flashcards.length === 0) {
          const topicPattern = /topic:\s*([^,]+?)(?:,\s*explanation:)/gi;
          const explanationPattern =
            /explanation:\s*([^}]+?)(?:\s*(?:,\s*\{|$))/gi;

          const topics = [...text.matchAll(topicPattern)].map((m) =>
            cleanText(m[1])
          );
          const explanations = [...text.matchAll(explanationPattern)].map((m) =>
            cleanText(m[1])
          );

          for (
            let i = 0;
            i < Math.min(topics.length, explanations.length);
            i++
          ) {
            flashcards.push({
              topic: topics[i],
              explanation: explanations[i],
            });
          }
        }
      }
    }

    // If still no flashcards, try parsing as regular array
    if (flashcards.length === 0 && Array.isArray(rawFlashcards)) {
      flashcards = rawFlashcards
        .filter((item: any) => item && typeof item === "object" && item.topic)
        .map((item: any) => ({
          topic: cleanText(item.topic),
          explanation: cleanText(item.explanation || "No explanation"),
        }));
    }

    console.log("Processed flashcards:", flashcards);
  } catch (error) {
    console.error("Error parsing flashcard data:", error);
    flashcards = [
      {
        topic: "Error",
        explanation: "Failed to load flashcard data. Please try again.",
      },
    ];
  }

  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index);
  });

  const renderCard = ({ item }: any) => {
    return (
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cardContent}
          >
            <Text style={styles.topicText}>{item.topic}</Text>
            <View style={styles.divider} />
            <Text style={styles.explanationText}>{item.explanation}</Text>
          </ScrollView>
        </View>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Flashcards</Text>
        <View style={styles.headerRight} />
      </View>

      {flashcards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No flashcards yet</Text>
          <Text style={styles.emptyText}>
            Upload an image with text to generate flashcards.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={flashcards}
            keyExtractor={(_, i) => i.toString()}
            renderItem={renderCard}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            contentContainerStyle={{ alignItems: "center" }}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {currentIndex + 1} / {flashcards.length}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function cleanText(text: string): string {
  return text
    .replace(/[{}[\]"']/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
    height: height * 0.6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: width * 0.9,
    height: height * 0.55,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 32,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  cardContent: {
    flexGrow: 1,
  },
  topicText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#4f46e5",
    marginBottom: 20,
    lineHeight: 36,
  },
  divider: {
    height: 2,
    backgroundColor: "#e5e7eb",
    marginBottom: 20,
  },
  explanationText: {
    fontSize: 18,
    color: "#374151",
    lineHeight: 28,
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
