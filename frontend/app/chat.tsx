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
  Animated,
} from "react-native";
import { useState, useCallback, useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
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
  const params = useLocalSearchParams();

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [feedSeed] = useState(Date.now().toString());
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [savedFlashcards, setSavedFlashcards] = useState<
    Array<{
      id: string;
      title: string;
      createdAt: string;
    }>
  >([]);
  const [savedQuizzes, setSavedQuizzes] = useState<
    Array<{
      id: string;
      title: string;
      createdAt: string;
      isCompleted: boolean;
      score?: number;
      totalQuestions?: number;
    }>
  >([]);

  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: sidebarVisible ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [sidebarVisible]);

  const loadSavedFlashcards = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      const response = await fetch(
        `${API_URL}/getSavedFlashcards?userId=${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSavedFlashcards(data.flashcards || []);
      } else {
        console.error("Failed to load flashcards:", response.statusText);
        setSavedFlashcards([]);
      }
    } catch (error) {
      console.error("Error loading saved flashcards:", error);
      setSavedFlashcards([]);
    }
  };

  const loadSavedQuizzes = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      const response = await fetch(
        `${API_URL}/getSavedQuizzes?userId=${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSavedQuizzes(data.quizzes || []);
      } else {
        console.error("Failed to load quizzes:", response.statusText);
        setSavedQuizzes([]);
      }
    } catch (error) {
      console.error("Error loading saved quizzes:", error);
      setSavedQuizzes([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setOffset(0);
      setFeedPosts([]);
      loadSavedFlashcards();
      loadSavedQuizzes();
      const newTopic = params.newTopic as string;
      if (newTopic) loadFeedData(newTopic);
      else loadFeedData();
    }, [params.newTopic])
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
        if (topicsResponse.ok && topicsData.topics)
          setTopics(topicsData.topics);
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
          const likedResponse = await fetch(
            `${API_URL}/getLikedPosts?userId=${userId}`
          );
          const likedData = await likedResponse.json();
          const likedPostIds = new Set(
            likedData.posts?.map((p: any) => p.postId) || []
          );

          const postsWithMetrics = data.posts.map((post: any) => ({
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
    if (hasMore && !loading && !currentTopic) loadFeedData(undefined, true);
  };

  const formatNumber = (num: number): string =>
    num >= 1000 ? (num / 1000).toFixed(1) + "K" : num.toString();

  const deleteFeed = async (topic: string) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;
      const response = await fetch(
        `${API_URL}/deleteFeed?userId=${userId}&topic=${encodeURIComponent(
          topic
        )}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        if (currentTopic === topic) setCurrentTopic(null);
        loadFeedData(
          currentTopic === topic ? undefined : currentTopic || undefined
        );
      }
    } catch (error) {
      console.error("Error deleting feed:", error);
    }
  };

  const deleteFlashcard = async (flashcardId: string) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      // Dummy endpoint for now - replace with actual backend call
      const response = await fetch(
        `${API_URL}/deleteFlashcard?userId=${userId}&flashcardId=${flashcardId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setSavedFlashcards((prev) =>
          prev.filter((fc) => fc.id !== flashcardId)
        );
      } else {
        Alert.alert("Error", "Failed to delete flashcard set");
      }
    } catch (error) {
      console.error("Error deleting flashcard:", error);
      Alert.alert("Error", "Something went wrong while deleting");
    }
  };

  const openFlashcard = async (flashcardId: string) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      const response = await fetch(
        `${API_URL}/getFlashcard?userId=${userId}&flashcardId=${flashcardId}`
      );

      if (response.ok) {
        const data = await response.json();
        router.push({
          pathname: "/flashcards",
          params: {
            data: encodeURIComponent(JSON.stringify(data.flashcards || [])),
          },
        });
      } else {
        Alert.alert("Error", "Failed to load flashcard set");
      }
    } catch (error) {
      console.error("Error opening flashcard:", error);
    }
  };

  const openQuiz = async (quizId: string) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      const response = await fetch(
        `${API_URL}/getQuiz?userId=${userId}&quizId=${quizId}`
      );

      if (response.ok) {
        const data = await response.json();
        router.push({
          pathname: "/quiz",
          params: {
            data: encodeURIComponent(
              JSON.stringify({
                questions: data.questions || [],
                title: data.title || "Quiz",
                id: quizId,
                isCompleted: data.isCompleted || false,
                score: data.score,
                totalQuestions: data.totalQuestions,
                userAnswers: data.userAnswers || [],
              })
            ),
          },
        });
      } else {
        Alert.alert("Error", "Failed to load quiz");
      }
    } catch (error) {
      console.error("Error opening quiz:", error);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      const response = await fetch(
        `${API_URL}/deleteQuiz?userId=${userId}&quizId=${quizId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setSavedQuizzes((prev) => prev.filter((quiz) => quiz.id !== quizId));
        Alert.alert("Success", "Quiz deleted successfully");
      } else {
        Alert.alert("Error", "Failed to delete quiz");
      }
    } catch (error) {
      console.error("Error deleting quiz:", error);
      Alert.alert("Error", "Something went wrong while deleting");
    }
  };

  const toggleLike = async (index: number) => {
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

  const getRandomName = (index: number): string =>
    RANDOM_NAMES[index % RANDOM_NAMES.length];

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

    if (result.canceled) return;
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
      });
      const data = await response.json();

      if (!response.ok) {
        Alert.alert("❌ Upload Failed", data.error || "Unknown error");
        return;
      }

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
              } catch {
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
                        JSON.stringify({
                          questions: result.quiz_questions || [],
                          title: "Generated Quiz",
                          id: "temp_quiz",
                        })
                      ),
                    },
                  });
                  // Reload quizzes after generation
                  loadSavedQuizzes();
                } else {
                  Alert.alert(
                    "Error",
                    result.error || "Failed to generate quiz."
                  );
                }
              } catch {
                Alert.alert(
                  "Error",
                  "Something went wrong while generating quiz."
                );
              } finally {
                setIsGeneratingQuiz(false);
              }
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Something went wrong while uploading.");
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => setSidebarVisible(!sidebarVisible)}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={28} color="#111827" />
          <Text style={styles.headerTitle}>Quickly</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={handleUpload}>
            <Ionicons name="cloud-upload-outline" size={28} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/liked")}
          >
            <Ionicons name="heart-outline" size={28} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/settings")}
          >
            <Ionicons name="person-circle" size={32} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SIDEBAR */}
      <Modal
        visible={sidebarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSidebarVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setSidebarVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Animated.View
              style={[
                styles.sidebar,
                { transform: [{ translateX: slideAnim }] },
              ]}
            >
              <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarTitle}>Quickly</Text>
                <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                  <Ionicons name="close" size={28} color="#111827" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.newChatButton}
                onPress={() => {
                  setSidebarVisible(false);
                  router.push("/chatbot");
                }}
              >
                <Ionicons name="add-circle" size={22} color="#fff" />
                <Text style={styles.newChatText}>New Chat</Text>
              </TouchableOpacity>

              <View style={styles.divider} />
              <ScrollView
                style={styles.sidebarContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sectionTitle}>FEEDS</Text>
                <TouchableOpacity
                  style={[
                    styles.sidebarItem,
                    !currentTopic && styles.sidebarItemActive,
                  ]}
                  onPress={() => {
                    setSidebarVisible(false);
                    loadFeedData();
                  }}
                >
                  <Ionicons
                    name="globe"
                    size={20}
                    color={!currentTopic ? "#6366f1" : "#6b7280"}
                  />
                  <Text
                    style={[
                      styles.sidebarItemText,
                      !currentTopic && styles.sidebarItemTextActive,
                    ]}
                  >
                    Public Feed
                  </Text>
                </TouchableOpacity>
                {topics.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                      MY TOPICS
                    </Text>
                    {topics.map((topic, i) => (
                      <View key={i} style={styles.sidebarItemRow}>
                        <TouchableOpacity
                          style={[
                            styles.sidebarItem,
                            currentTopic === topic && styles.sidebarItemActive,
                            styles.sidebarItemWithDelete,
                          ]}
                          onPress={() => {
                            setSidebarVisible(false);
                            loadFeedData(topic);
                          }}
                        >
                          <Ionicons
                            name="book"
                            size={20}
                            color={
                              currentTopic === topic ? "#6366f1" : "#6b7280"
                            }
                          />
                          <Text
                            style={[
                              styles.sidebarItemText,
                              currentTopic === topic &&
                                styles.sidebarItemTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {topic}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteIconButton}
                          onPress={() => deleteFeed(topic)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#ef4444"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}

                {savedFlashcards.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                      FLASHCARDS
                    </Text>
                    {savedFlashcards.map((flashcard, i) => (
                      <View key={flashcard.id} style={styles.sidebarItemRow}>
                        <TouchableOpacity
                          style={[
                            styles.sidebarItem,
                            styles.sidebarItemWithDelete,
                          ]}
                          onPress={() => {
                            setSidebarVisible(false);
                            openFlashcard(flashcard.id);
                          }}
                        >
                          <Ionicons name="card" size={20} color="#6b7280" />
                          <View style={styles.flashcardInfo}>
                            <Text
                              style={styles.sidebarItemText}
                              numberOfLines={1}
                            >
                              {flashcard.title}
                            </Text>
                            <Text style={styles.flashcardDate}>
                              {new Date(
                                flashcard.createdAt
                              ).toLocaleDateString()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteIconButton}
                          onPress={() => deleteFlashcard(flashcard.id)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#ef4444"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}

                {savedQuizzes.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                      QUIZZES
                    </Text>
                    {savedQuizzes.map((quiz, i) => (
                      <View key={quiz.id} style={styles.sidebarItemRow}>
                        <TouchableOpacity
                          style={[
                            styles.sidebarItem,
                            styles.sidebarItemWithDelete,
                          ]}
                          onPress={() => {
                            setSidebarVisible(false);
                            openQuiz(quiz.id);
                          }}
                        >
                          <Ionicons
                            name="help-circle"
                            size={20}
                            color="#6b7280"
                          />
                          <View style={styles.flashcardInfo}>
                            <Text
                              style={styles.sidebarItemText}
                              numberOfLines={1}
                            >
                              {quiz.title}
                            </Text>
                            <View style={styles.quizInfo}>
                              <Text style={styles.flashcardDate}>
                                {new Date(quiz.createdAt).toLocaleDateString()}
                              </Text>
                              {quiz.isCompleted && (
                                <Text style={styles.quizScore}>
                                  Score: {quiz.score}/{quiz.totalQuestions}
                                </Text>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteIconButton}
                          onPress={() => deleteQuiz(quiz.id)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#ef4444"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* FEED */}
      <ScrollView
        style={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (
            contentSize.height - (layoutMeasurement.height + contentOffset.y) <
            800
          )
            loadMore();
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
          feedPosts.map((post, i) => (
            <View key={i} style={styles.postContainer}>
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
                    onPress={() => toggleLike(i)}
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
                  <Text style={styles.likedByName}>{getRandomName(i)}</Text> and{" "}
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
            </View>
          ))
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

      {/* GENERATING FLASHCARDS */}
      <Modal visible={isGeneratingFlashcards} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.modalLoadingText}>
              Generating flashcards...
            </Text>
          </View>
        </View>
      </Modal>

      {/* GENERATING QUIZ */}
      <Modal visible={isGeneratingQuiz} transparent animationType="fade">
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  iconButton: { padding: 4 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
  },
  sidebar: {
    width: 280,
    height: "100%",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  sidebarTitle: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#6366f1",
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  newChatText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 20,
    marginVertical: 20,
  },
  sidebarContent: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 1,
    marginBottom: 12,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarItemActive: { backgroundColor: "#eef2ff" },
  sidebarItemRow: { flexDirection: "row", alignItems: "center" },
  sidebarItemWithDelete: { flex: 1 },
  sidebarItemText: {
    fontSize: 15,
    color: "#6b7280",
    fontWeight: "500",
    flex: 1,
  },
  sidebarItemTextActive: { color: "#6366f1", fontWeight: "600" },
  deleteIconButton: { padding: 8 },
  flashcardInfo: {
    flex: 1,
    marginLeft: 0,
  },
  flashcardDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  quizInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  quizScore: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "600",
  },
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
  loadingMore: { padding: 16, alignItems: "center" },
  loadingText: { color: "#6b7280" },
  endOfFeed: { padding: 16, alignItems: "center" },
  endOfFeedText: { color: "#6b7280" },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
