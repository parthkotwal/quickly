import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { API_URL } from "../config";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_CONTAINER_HEIGHT = 400;

const RANDOM_NAMES = [
  "Sarah Chen",
  "Michael Rodriguez",
  "Emma Watson",
  "James Kim",
  "Olivia Martinez",
  "Noah Johnson",
  "Ava Williams",
  "Liam Brown",
  "Sophia Davis",
  "Lucas Miller",
  "Isabella Garcia",
  "Mason Wilson",
];

interface FeedPost {
  imageUrl: string;
  text: string;
  musicTitle?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
}

export default function ChatScreen() {
  const router = useRouter();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [feedSeed] = useState(Date.now().toString());
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  // Load feed data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setOffset(0);
      setFeedPosts([]);
      loadFeedData();
    }, [])
  );

  const loadFeedData = async (filterTopic?: string, append = false) => {
    if (loading) return;

    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem("userId");

      if (userId && !append) {
        const topicsResponse = await fetch(
          `${API_URL}/getTopics?userId=${userId}`
        );
        const topicsData = await topicsResponse.json();
        if (topicsResponse.ok && topicsData.topics) {
          setTopics(topicsData.topics);
        }
      }

      if (userId) {
        let response;
        let data;
        const currentOffset = append ? offset : 0;

        if (filterTopic) {
          response = await fetch(
            `${API_URL}/getFeedByTopic?userId=${userId}&topic=${encodeURIComponent(
              filterTopic
            )}`
          );
          data = await response.json();
          setCurrentTopic(filterTopic);
          setHasMore(false);
        } else {
          response = await fetch(
            `${API_URL}/getPublicFeed?limit=10&offset=${currentOffset}&seed=${feedSeed}`
          );
          data = await response.json();
          setCurrentTopic(null);
          setHasMore(data.has_more || false);
        }

        if (response.ok && data.posts) {
          let posts = data.posts;

          const likedResponse = await fetch(
            `${API_URL}/getLikedPosts?userId=${userId}`
          );
          const likedData = await likedResponse.json();
          const likedPostIds = new Set(
            likedData.posts?.map((p: any) => p.postId) || []
          );

          const postsWithMetrics = posts.map((post: any) => ({
            ...post,
            likes: post.likes || Math.floor(Math.random() * 10000) + 100,
            comments: post.comments || Math.floor(Math.random() * 500) + 10,
            shares: post.shares || Math.floor(Math.random() * 200) + 5,
            isLiked: likedPostIds.has(post.postId),
          }));

          if (append) {
            setFeedPosts((prev) => [...prev, ...postsWithMetrics]);
            setOffset(currentOffset + postsWithMetrics.length);
          } else {
            setFeedPosts(postsWithMetrics);
            setOffset(postsWithMetrics.length);
          }
        }
      }
    } catch (error) {
      console.error("Error loading feed data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading && !currentTopic) {
      loadFeedData(undefined, true);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const deleteFeed = async (topic: string) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;
      const response = await fetch(
        `${API_URL}/deleteFeed?userId=${userId}&topic=${encodeURIComponent(
          topic
        )}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        console.log(`✅ Deleted feed: ${topic}`);
        if (currentTopic === topic) setCurrentTopic(null);
        loadFeedData(
          currentTopic === topic ? undefined : currentTopic || undefined
        );
      }
    } catch (error) {
      console.error("Error deleting feed:", error);
    }
  };

  const toggleLike = async (index: number): Promise<void> => {
    const post = feedPosts[index];
    const newLikedState = !post.isLiked;

    setFeedPosts((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              ...p,
              isLiked: newLikedState,
              likes: newLikedState ? p.likes + 1 : p.likes - 1,
            }
          : p
      )
    );

    try {
      const userId = await AsyncStorage.getItem("userId");
      await fetch(`${API_URL}/toggleLike`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          postId: (post as any).postId || `${index}`,
          postData: post,
          action: newLikedState ? "like" : "unlike",
        }),
      });
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const getRandomName = (index: number): string => {
    return RANDOM_NAMES[index % RANDOM_NAMES.length];
  };

  const handleUpload = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow access to your photo library to upload."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 4],
      quality: 1,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      const userId = await AsyncStorage.getItem("userId");

      if (!userId) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      try {
        const formData = new FormData();
        formData.append("userId", userId);
        formData.append("file", {
          uri: imageUri,
          name: "upload.jpg",
          type: "image/jpeg",
        } as any);

        const response = await fetch(`${API_URL}/uploadImage`, {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        const data = await response.json();

        if (response.ok) {
          // Show options for what to do with the uploaded image
          Alert.alert(
            "Choose an option",
            "What would you like to create with this image?",
            [
              {
                text: "Flashcards/Notes",
                onPress: async () => {
                  setIsGeneratingFlashcards(true);
                  try {
                    const formData = new FormData();
                    formData.append("userId", userId);
                    formData.append("file", {
                      uri: imageUri,
                      name: "upload.jpg",
                      type: "image/jpeg",
                    } as any);

                    const res = await fetch(`${API_URL}/generateFlashcards`, {
                      method: "POST",
                      body: formData,
                    });
                    const result = await res.json();

                    if (res.ok) {
                      router.push({
                        pathname: "/flashcards",
                        params: {
                          data: encodeURIComponent(
                            JSON.stringify(result.flashcards || [])
                          ),
                        },
                      });
                    } else {
                      Alert.alert(
                        "Error",
                        result.error || "Failed to generate flashcards."
                      );
                    }
                  } catch (error) {
                    Alert.alert(
                      "Error",
                      "Something went wrong while generating flashcards."
                    );
                  } finally {
                    setIsGeneratingFlashcards(false);
                  }
                },
              },
              {
                text: "Quizzes",
                onPress: async () => {
                  setIsGeneratingQuiz(true);
                  try {
                    const formData = new FormData();
                    formData.append("userId", userId);
                    formData.append("file", {
                      uri: imageUri,
                      name: "upload.jpg",
                      type: "image/jpeg",
                    } as any);

                    const res = await fetch(`${API_URL}/generateQuiz`, {
                      method: "POST",
                      body: formData,
                    });
                    const result = await res.json();

                    if (res.ok) {
                      router.push({
                        pathname: "/quiz",
                        params: {
                          data: encodeURIComponent(
                            JSON.stringify(result.quiz || [])
                          ),
                        },
                      });
                    } else {
                      Alert.alert(
                        "Error",
                        result.error || "Failed to generate quiz."
                      );
                    }
                  } catch (error) {
                    Alert.alert(
                      "Error",
                      "Something went wrong while generating quiz."
                    );
                  } finally {
                    setIsGeneratingQuiz(false);
                  }
                },
              },
              {
                text: "Cancel",
                style: "cancel",
              },
            ]
          );
        } else {
          Alert.alert("❌ Upload Failed", data.error || "Unknown error");
        }
      } catch (error) {
        console.error("Upload error:", error);
        Alert.alert("Error", "Something went wrong while uploading.");
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => setDropdownVisible(!dropdownVisible)}
        >
          <Text style={styles.headerTitle}>Quickly</Text>
          <Ionicons name="chevron-down" size={20} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {/* Upload (Cloud) Icon */}
          <TouchableOpacity style={styles.iconButton} onPress={handleUpload}>
            <Ionicons name="cloud-upload-outline" size={28} color="#111827" />
          </TouchableOpacity>

          {/* Liked */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/liked")}
          >
            <Ionicons name="heart-outline" size={28} color="#111827" />
          </TouchableOpacity>

          {/* Profile */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/settings")}
          >
            <Ionicons name="person-circle" size={32} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown */}
      {dropdownVisible && (
        <View style={styles.dropdown}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setDropdownVisible(false);
              router.push("/chatbot");
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#111827" />
            <Text style={styles.dropdownText}>New Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dropdownItem,
              !currentTopic && styles.dropdownItemActive,
            ]}
            onPress={() => {
              setDropdownVisible(false);
              loadFeedData();
            }}
          >
            <Ionicons
              name="globe-outline"
              size={20}
              color={!currentTopic ? "#6366f1" : "#111827"}
            />
            <Text
              style={[
                styles.dropdownText,
                !currentTopic && styles.dropdownTextActive,
              ]}
            >
              Public Feed
            </Text>
          </TouchableOpacity>

          {topics.map((topic, index) => (
            <View key={index} style={styles.dropdownItemRow}>
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  currentTopic === topic && styles.dropdownItemActive,
                  styles.dropdownItemWithDelete,
                ]}
                onPress={() => {
                  setDropdownVisible(false);
                  loadFeedData(topic);
                }}
              >
                <Ionicons
                  name="book-outline"
                  size={20}
                  color={currentTopic === topic ? "#6366f1" : "#111827"}
                />
                <Text
                  style={[
                    styles.dropdownText,
                    currentTopic === topic && styles.dropdownTextActive,
                  ]}
                >
                  {topic}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteFeed(topic)}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Feed */}
      <ScrollView
        style={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - 20;
          if (isCloseToBottom) loadMore();
        }}
        scrollEventThrottle={400}
      >
        {feedPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No feed yet</Text>
            <Text style={styles.emptyText}>
              Start a new chat to generate your personalized learning feed!
            </Text>
          </View>
        ) : (
          feedPosts.map((post, index) => {
            const likedByName = getRandomName(index);
            return (
              <View key={index} style={styles.postContainer}>
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: post.imageUrl }}
                    style={styles.postImage}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.postActions}>
                  <View style={styles.actionsLeft}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => toggleLike(index)}
                    >
                      <Ionicons
                        name={post.isLiked ? "heart" : "heart-outline"}
                        size={28}
                        color={post.isLiked ? "#ef4444" : "#111827"}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={28}
                        color="#111827"
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons
                      name="paper-plane-outline"
                      size={28}
                      color="#111827"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.likedBySection}>
                  <Text style={styles.likedByText}>
                    Liked by{" "}
                    <Text style={styles.likedByName}>{likedByName}</Text> and{" "}
                    <Text style={styles.likedByName}>
                      {formatNumber(post.likes - 1)} others
                    </Text>
                  </Text>
                </View>

                <View style={styles.captionContainer}>
                  <Text style={styles.captionText}>
                    <Text style={styles.usernameText}>
                      u/{(post as any).username || "anonymous"}
                    </Text>{" "}
                    {post.text}
                  </Text>
                </View>

                <TouchableOpacity style={styles.viewCommentsButton}>
                  <Text style={styles.viewCommentsText}>
                    View all {formatNumber(post.comments)} comments
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {loading && feedPosts.length > 0 && (
          <View style={styles.loadingMore}>
            <Text style={styles.loadingText}>Loading more...</Text>
          </View>
        )}
        {!hasMore && feedPosts.length > 0 && !currentTopic && (
          <View style={styles.endOfFeed}>
            <Text style={styles.endOfFeedText}>You've seen all posts! ✨</Text>
          </View>
        )}
      </ScrollView>

      {/* Loading Modal for Flashcards */}
      <Modal
        visible={isGeneratingFlashcards}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.modalLoadingText}>
              Generating flashcards...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Loading Modal for Quiz */}
      <Modal visible={isGeneratingQuiz} transparent={true} animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.modalLoadingText}>Generating quiz...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  iconButton: { padding: 4 },
  dropdown: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  dropdownItemRow: { flexDirection: "row", alignItems: "center" },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingHorizontal: 20,
  },
  dropdownItemWithDelete: { flex: 1, paddingRight: 0 },
  dropdownItemActive: { backgroundColor: "#eef2ff" },
  deleteButton: { padding: 16, paddingLeft: 8, paddingRight: 20 },
  dropdownText: { fontSize: 16, color: "#111827", fontWeight: "500" },
  dropdownTextActive: { color: "#6366f1", fontWeight: "600" },
  feedContainer: { flex: 1, backgroundColor: "#fff" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    minHeight: 500,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: { fontSize: 16, color: "#6b7280", textAlign: "center" },
  postContainer: {
    marginBottom: 24,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#efefef",
    paddingBottom: 16,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_CONTAINER_HEIGHT,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  postImage: { width: "100%", height: "100%" },
  postActions: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionsLeft: { flexDirection: "row", gap: 16 },
  actionButton: { padding: 4 },
  likedBySection: { paddingHorizontal: 14, paddingBottom: 8 },
  likedByText: { fontSize: 14, color: "#000" },
  likedByName: { fontWeight: "600", color: "#000" },
  captionContainer: { paddingHorizontal: 14, paddingBottom: 4 },
  captionText: { fontSize: 14, color: "#000", lineHeight: 20 },
  usernameText: { fontWeight: "bold", color: "#000" },
  viewCommentsButton: { paddingHorizontal: 14, paddingTop: 4 },
  viewCommentsText: { fontSize: 14, color: "#737373" },
  loadingMore: { padding: 20, alignItems: "center" },
  loadingText: { fontSize: 16, color: "#6b7280" },
  endOfFeed: { padding: 20, alignItems: "center" },
  endOfFeedText: { fontSize: 16, color: "#6b7280" },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
  },
  modalLoadingText: {
    fontSize: 18,
    color: "#6366f1",
    fontWeight: "600",
    marginTop: 15,
    textAlign: "center",
  },
});
