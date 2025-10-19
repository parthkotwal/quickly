import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";
import BottomNavBar from "../components/BottomNavBar";

interface Post {
  postId: string;
  text: string;
  imageUrl: string;
  topic: string;
  username?: string;
  userId: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllPosts();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [searchQuery, allPosts]);

  const loadAllPosts = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem("userId");

      // Load public feed
      const response = await fetch(
        `${API_URL}/getPublicFeed?limit=100&offset=0`
      );

      if (response.ok) {
        const data = await response.json();
        setAllPosts(data.posts || []);
        setFilteredPosts(data.posts || []);
      }
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterPosts = () => {
    if (!searchQuery.trim()) {
      setFilteredPosts(allPosts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allPosts.filter((post) => {
      // Search by title/topic first
      if (post.topic?.toLowerCase().includes(query)) {
        return true;
      }
      // Then by AI description (text)
      if (post.text?.toLowerCase().includes(query)) {
        return true;
      }
      // Then by user
      if (post.username?.toLowerCase().includes(query)) {
        return true;
      }
      return false;
    });

    setFilteredPosts(filtered);
  };

  const viewPost = (post: Post) => {
    router.push({
      pathname: "/post-detail",
      params: {
        postId: post.postId,
        imageUrl: post.imageUrl,
        text: post.text,
        topic: post.topic,
        username: post.username || "Anonymous",
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title, description, or user..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post, index) => (
                <TouchableOpacity
                  key={post.postId || index}
                  style={styles.gridItem}
                  onPress={() => viewPost(post)}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
                  <View style={styles.postOverlay}>
                    <Text style={styles.postTopic} numberOfLines={1}>
                      {post.topic}
                    </Text>
                    {post.username && (
                      <Text style={styles.postUser} numberOfLines={1}>
                        @{post.username}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>
                  {searchQuery ? "No posts found" : "Start searching for posts"}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
  },
  gridItem: {
    width: "48%",
    aspectRatio: 1,
    margin: "1%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  postOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 8,
  },
  postTopic: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  postUser: {
    fontSize: 10,
    color: "#e5e7eb",
  },
  emptyContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
    marginTop: 16,
  },
});
