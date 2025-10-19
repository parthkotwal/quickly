import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Dimensions, Modal, Animated } from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_CONTAINER_HEIGHT = 400;

const RANDOM_NAMES = [
  'Sarah Chen', 'Michael Rodriguez', 'Emma Watson', 'James Kim',
  'Olivia Martinez', 'Noah Johnson', 'Ava Williams', 'Liam Brown',
  'Sophia Davis', 'Lucas Miller', 'Isabella Garcia', 'Mason Wilson'
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
  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: sidebarVisible ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [sidebarVisible]);

  useFocusEffect(
    useCallback(() => {
      setOffset(0);
      setFeedPosts([]);
      const newTopic = params.newTopic as string;
      if (newTopic) {
        loadFeedData(newTopic);
      } else {
        loadFeedData();
      }
    }, [params.newTopic])
  );

  const loadFeedData = async (filterTopic?: string, append = false) => {
    if (loading) return;

    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('userId');

      if (userId && !append) {
        const topicsResponse = await fetch(`${API_URL}/getTopics?userId=${userId}`);
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
          response = await fetch(`${API_URL}/getFeedByTopic?userId=${userId}&topic=${encodeURIComponent(filterTopic)}`);
          data = await response.json();
          setCurrentTopic(filterTopic);
          setHasMore(false);
        } else {
          response = await fetch(`${API_URL}/getPublicFeed?limit=10&offset=${currentOffset}&seed=${feedSeed}`);
          data = await response.json();
          setCurrentTopic(null);
          setHasMore(data.has_more || false);
        }

        if (response.ok && data.posts) {
          let posts = data.posts;

          const likedResponse = await fetch(`${API_URL}/getLikedPosts?userId=${userId}`);
          const likedData = await likedResponse.json();
          const likedPostIds = new Set(likedData.posts?.map((p: any) => p.postId) || []);

          const postsWithMetrics = posts.map((post: any) => ({
            ...post,
            likes: post.likes || Math.floor(Math.random() * 10000) + 100,
            comments: post.comments || Math.floor(Math.random() * 500) + 10,
            shares: post.shares || Math.floor(Math.random() * 200) + 5,
            isLiked: likedPostIds.has(post.postId),
          }));

          if (append) {
            setFeedPosts(prev => [...prev, ...postsWithMetrics]);
            setOffset(currentOffset + postsWithMetrics.length);
          } else {
            setFeedPosts(postsWithMetrics);
            setOffset(postsWithMetrics.length);
          }
        }
      }
    } catch (error) {
      console.error('Error loading feed data:', error);
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
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const deleteFeed = async (topic: string) => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const response = await fetch(`${API_URL}/deleteFeed?userId=${userId}&topic=${encodeURIComponent(topic)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (currentTopic === topic) setCurrentTopic(null);
        loadFeedData(currentTopic === topic ? undefined : currentTopic);
      }
    } catch (error) {
      console.error('Error deleting feed:', error);
    }
  };

  const toggleLike = async (index: number): Promise<void> => {
    const post = feedPosts[index];
    const newLikedState = !post.isLiked;

    setFeedPosts(prevPosts =>
      prevPosts.map((p, i) =>
        i === index
          ? {
              ...p,
              isLiked: newLikedState,
              likes: newLikedState ? p.likes + 1 : p.likes - 1
            }
          : p
      )
    );

    try {
      const userId = await AsyncStorage.getItem('userId');
      await fetch(`${API_URL}/toggleLike`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          postId: (post as any).postId || `${index}`,
          postData: post,
          action: newLikedState ? 'like' : 'unlike',
        }),
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      setFeedPosts(prevPosts =>
        prevPosts.map((p, i) =>
          i === index
            ? { ...p, isLiked: !newLikedState, likes: newLikedState ? p.likes - 1 : p.likes + 1 }
            : p
        )
      );
    }
  };

  const getRandomName = (index: number): string => {
    return RANDOM_NAMES[index % RANDOM_NAMES.length];
  };

  return (
    <View style={styles.container}>
      {/* Header */}
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
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/liked')}
            activeOpacity={0.7}
          >
            <Ionicons name="heart-outline" size={28} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle" size={32} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sidebar Modal */}
      <Modal
        visible={sidebarVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSidebarVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setSidebarVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.sidebar,
                { transform: [{ translateX: slideAnim }] }
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
                router.push('/chatbot');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={styles.newChatText}>New Chat</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>FEEDS</Text>

              <TouchableOpacity
                style={[styles.sidebarItem, !currentTopic && styles.sidebarItemActive]}
                onPress={() => {
                  setSidebarVisible(false);
                  loadFeedData();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="globe" size={20} color={!currentTopic ? "#6366f1" : "#6b7280"} />
                <Text style={[styles.sidebarItemText, !currentTopic && styles.sidebarItemTextActive]}>
                  Public Feed
                </Text>
              </TouchableOpacity>

              {topics.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 20 }]}>MY TOPICS</Text>
                  {topics.map((topic, index) => (
                    <View key={index} style={styles.sidebarItemRow}>
                      <TouchableOpacity
                        style={[styles.sidebarItem, currentTopic === topic && styles.sidebarItemActive, styles.sidebarItemWithDelete]}
                        onPress={() => {
                          setSidebarVisible(false);
                          loadFeedData(topic);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="book" size={20} color={currentTopic === topic ? "#6366f1" : "#6b7280"} />
                        <Text style={[styles.sidebarItemText, currentTopic === topic && styles.sidebarItemTextActive]} numberOfLines={1}>
                          {topic}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteIconButton}
                        onPress={() => deleteFeed(topic)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
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

      {/* Feed */}
      <ScrollView
        style={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          // Load more when user is 800px from the bottom (about 2 posts before end)
          const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
          if (distanceFromBottom < 800) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {feedPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No feed yet</Text>
            <Text style={styles.emptyText}>Start a new chat to generate your personalized learning feed!</Text>
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
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name={post.isLiked ? "heart" : "heart-outline"}
                        size={28}
                        color={post.isLiked ? "#ef4444" : "#111827"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} activeOpacity={0.6}>
                      <Ionicons name="chatbubble-outline" size={28} color="#111827" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.actionButton} activeOpacity={0.6}>
                    <Ionicons name="paper-plane-outline" size={28} color="#111827" />
                  </TouchableOpacity>
                </View>

                <View style={styles.likedBySection}>
                  <Text style={styles.likedByText}>
                    Liked by <Text style={styles.likedByName}>{likedByName}</Text> and{' '}
                    <Text style={styles.likedByName}>{formatNumber(post.likes - 1)} others</Text>
                  </Text>
                </View>

                <View style={styles.captionContainer}>
                  <Text style={styles.captionText}>
                    <Text style={styles.usernameText}>u/{(post as any).username || 'anonymous'}</Text>
                    {' '}{post.text}
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

      {/* Floating Edit Feed Button */}
      {currentTopic && (
        <View style={styles.editFeedContainer}>
          <TouchableOpacity
            style={styles.editFeedButton}
            onPress={() => router.push({ pathname: '/chatbot', params: { topic: currentTopic } })}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.editFeedText}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconButton: { padding: 4 },

  editFeedContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 1000,
  },
  editFeedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  editFeedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  sidebar: {
    width: 280,
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#6366f1',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  newChatText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 20,
    marginVertical: 20,
  },
  sidebarContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarItemActive: {
    backgroundColor: '#eef2ff',
  },
  sidebarItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidebarItemWithDelete: {
    flex: 1,
  },
  sidebarItemText: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  sidebarItemTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  deleteIconButton: {
    padding: 8,
  },

  dropdown: {
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
  },
  dropdownItemRow: { flexDirection: 'row', alignItems: 'center' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingHorizontal: 20 },
  dropdownItemWithDelete: { flex: 1, paddingRight: 0 },
  dropdownItemActive: { backgroundColor: '#eef2ff' },
  deleteButton: { padding: 16, paddingLeft: 8, paddingRight: 20 },
  dropdownText: { fontSize: 16, color: '#111827', fontWeight: '500' },
  dropdownTextActive: { color: '#6366f1', fontWeight: '600' },

  feedContainer: { flex: 1, backgroundColor: '#fff' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, minHeight: 500 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  postContainer: { marginBottom: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#efefef', paddingBottom: 16 },
  imageContainer: { width: SCREEN_WIDTH, height: IMAGE_CONTAINER_HEIGHT, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  postImage: { width: '100%', height: '100%' },
  postActions: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'space-between', alignItems: 'center' },
  actionsLeft: { flexDirection: 'row', gap: 16 },
  actionButton: { padding: 4 },
  likedBySection: { paddingHorizontal: 14, paddingBottom: 8 },
  likedByText: { fontSize: 14, color: '#000' },
  likedByName: { fontWeight: '600', color: '#000' },
  captionContainer: { paddingHorizontal: 14, paddingBottom: 4 },
  captionText: { fontSize: 14, color: '#000', lineHeight: 20 },
  usernameText: { fontWeight: 'bold', color: '#000' },
  viewCommentsButton: { paddingHorizontal: 14, paddingTop: 4 },
  viewCommentsText: { fontSize: 14, color: '#737373' },
  loadingMore: { padding: 16, alignItems: 'center' },
  loadingText: { color: '#6b7280' },
  endOfFeed: { padding: 16, alignItems: 'center' },
  endOfFeedText: { color: '#6b7280' }
});
