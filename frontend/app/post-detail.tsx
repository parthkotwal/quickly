import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function PostDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { imageUrl, text, topic, username } = params;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Topic and User Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.topic}>{topic}</Text>
          {username && (
            <Text style={styles.username}>@{username}</Text>
          )}
        </View>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl as string }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        {/* Description */}
        <View style={styles.textContainer}>
          <Text style={styles.text}>{text}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  infoContainer: {
    padding: 20,
    backgroundColor: "#fff",
  },
  topic: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  username: {
    fontSize: 16,
    color: "#6366f1",
    fontWeight: "600",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: 400,
    backgroundColor: "#e5e7eb",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    padding: 20,
    backgroundColor: "#fff",
    marginTop: 1,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
  },
});
