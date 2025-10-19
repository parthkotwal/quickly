import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// CUSTOMIZATION: Image container height - the white box that contains the image
const IMAGE_CONTAINER_HEIGHT = 400; // Change this for bigger/smaller posts

// Random names for "liked by" section
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
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [feedSeed] = useState(Date.now().toString()); // Consistent seed for pagination

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
      const userId = await AsyncStorage.getItem('userId');

      // Load topics from DynamoDB (user's own topics only)
      if (userId && !append) {
        const topicsResponse = await fetch(`${API_URL}/getTopics?userId=${userId}`);
        const topicsData = await topicsResponse.json();
        if (topicsResponse.ok && topicsData.topics) {
          setTopics(topicsData.topics);
        }
      }

      // Load posts - either filtered by topic or public feed
      if (userId) {
        let response;
        let data;

        const currentOffset = append ? offset : 0;

        if (filterTopic) {
          // Load user's specific topic (no pagination for now)
          response = await fetch(`${API_URL}/getFeedByTopic?userId=${userId}&topic=${encodeURIComponent(filterTopic)}`);
          data = await response.json();
          setCurrentTopic(filterTopic);
          setHasMore(false); // No pagination for filtered topics
        } else {
          // Load PUBLIC feed with pagination
          response = await fetch(`${API_URL}/getPublicFeed?limit=10&offset=${currentOffset}&seed=${feedSeed}`);
          data = await response.json();
          setCurrentTopic(null);
          setHasMore(data.has_more || false);
        }

        if (response.ok && data.posts) {
          let posts = data.posts;

          // Check which posts are liked
          const likedResponse = await fetch(`${API_URL}/getLikedPosts?userId=${userId}`);
          const likedData = await likedResponse.json();
          const likedPostIds = new Set(likedData.posts?.map((p: any) => p.postId) || []);

          // Add metrics and liked status
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
      loadFeedData(undefined, true); // Load more posts (append)
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

      if (!userId) {
        console.error('No userId found');
        return;
      }

      // Delete feed from backend
      const response = await fetch(`${API_URL}/deleteFeed?userId=${userId}&topic=${encodeURIComponent(topic)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log(`✅ Deleted feed: ${topic}`);

        // If currently viewing the deleted topic, switch to all topics
        if (currentTopic === topic) {
          setCurrentTopic(null);
        }

        // Reload data
        loadFeedData(currentTopic === topic ? undefined : currentTopic);
      } else {
        console.error('Failed to delete feed');
      }
    } catch (error) {
      console.error('Error deleting feed:', error);
    }
  };

  const toggleLike = async (index: number): Promise<void> => {
    const post = feedPosts[index];
    const newLikedState = !post.isLiked;

    // Optimistically update UI
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

    // Save to backend
    try {
      const userId = await AsyncStorage.getItem('userId');

      await fetch(`${API_URL}/toggleLike`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          postId: (post as any).postId || `${index}`, // Use postId if available
          postData: post,
          action: newLikedState ? 'like' : 'unlike',
        }),
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
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
          onPress={() => setDropdownVisible(!dropdownVisible)}
        >
          <Text style={styles.headerTitle}>Quickly</Text>
          <Ionicons name="chevron-down" size={20} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/liked')}
          >
            <Ionicons name="heart-outline" size={28} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="person-circle" size={32} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu */}
      {dropdownVisible && (
        <View style={styles.dropdown}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setDropdownVisible(false);
              router.push('/chatbot');
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#111827" />
            <Text style={styles.dropdownText}>New Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dropdownItem, !currentTopic && styles.dropdownItemActive]}
            onPress={() => {
              setDropdownVisible(false);
              loadFeedData(); // Show public feed from everyone
            }}
          >
            <Ionicons name="globe-outline" size={20} color={!currentTopic ? "#6366f1" : "#111827"} />
            <Text style={[styles.dropdownText, !currentTopic && styles.dropdownTextActive]}>
              Public Feed
            </Text>
          </TouchableOpacity>

          {topics.map((topic, index) => (
            <View key={index} style={styles.dropdownItemRow}>
              <TouchableOpacity
                style={[styles.dropdownItem, currentTopic === topic && styles.dropdownItemActive, styles.dropdownItemWithDelete]}
                onPress={() => {
                  setDropdownVisible(false);
                  loadFeedData(topic); // Filter by this topic
                }}
              >
                <Ionicons name="book-outline" size={20} color={currentTopic === topic ? "#6366f1" : "#111827"} />
                <Text style={[styles.dropdownText, currentTopic === topic && styles.dropdownTextActive]}>
                  {topic}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  deleteFeed(topic);
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Classic Instagram Feed */}
      <ScrollView
        style={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        onScroll={({nativeEvent}) => {
          const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
          if (isCloseToBottom) {
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
                {/* Image Container - Full width white background */}
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: post.imageUrl }}
                    style={styles.postImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Actions Row - Instagram Style */}
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
                      <Ionicons name="chatbubble-outline" size={28} color="#111827" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="paper-plane-outline" size={28} color="#111827" />
                  </TouchableOpacity>
                </View>

                {/* Liked By Section */}
                <View style={styles.likedBySection}>
                  <Text style={styles.likedByText}>
                    Liked by <Text style={styles.likedByName}>{likedByName}</Text> and{' '}
                    <Text style={styles.likedByName}>{formatNumber(post.likes - 1)} others</Text>
                  </Text>
                </View>

                {/* Caption with Username */}
                <View style={styles.captionContainer}>
                  <Text style={styles.captionText}>
                    <Text style={styles.usernameText}>u/{(post as any).username || 'anonymous'}</Text>
                    {' '}{post.text}
                  </Text>
                </View>

                {/* View Comments */}
                <TouchableOpacity style={styles.viewCommentsButton}>
                  <Text style={styles.viewCommentsText}>
                    View all {formatNumber(post.comments)} comments
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Loading indicator at bottom */}
        {loading && feedPosts.length > 0 && (
          <View style={styles.loadingMore}>
            <Text style={styles.loadingText}>Loading more...</Text>
          </View>
        )}

        {/* No more posts indicator */}
        {!hasMore && feedPosts.length > 0 && !currentTopic && (
          <View style={styles.endOfFeed}>
            <Text style={styles.endOfFeedText}>You've seen all posts! ✨</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingHorizontal: 20,
  },
  dropdownItemWithDelete: {
    flex: 1,
    paddingRight: 0,
  },
  dropdownItemActive: {
    backgroundColor: '#eef2ff',
  },
  deleteButton: {
    padding: 16,
    paddingLeft: 8,
    paddingRight: 20,
  },
  dropdownText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  dropdownTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  feedContainer: {
    flex: 1,
    backgroundColor: '#fff', // Instagram white background
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 500,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  // CUSTOMIZATION: Post container - each Instagram post
  postContainer: {
    marginBottom: 24, // Space between posts
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
    paddingBottom: 16,
  },
  // CUSTOMIZATION: Image container - white box that holds image
  imageContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_CONTAINER_HEIGHT, // Adjust IMAGE_CONTAINER_HEIGHT at top of file
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // CUSTOMIZATION: Image - contained, not stretched
  postImage: {
    width: '100%',
    height: '100%',
  },
  // CUSTOMIZATION: Actions row (Instagram style)
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'space-between', // Like/comment left, share right
    alignItems: 'center',
  },
  actionsLeft: {
    flexDirection: 'row',
    gap: 16, // Space between like and comment
  },
  // CUSTOMIZATION: Individual action button
  actionButton: {
    padding: 4,
  },
  // CUSTOMIZATION: "Liked by" section
  likedBySection: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  likedByText: {
    fontSize: 14,
    color: '#000',
  },
  likedByName: {
    fontWeight: '600', // Bold names
    color: '#000',
  },
  // CUSTOMIZATION: Caption container
  captionContainer: {
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  captionText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  usernameText: {
    fontWeight: 'bold',
    color: '#000',
  },
  // CUSTOMIZATION: View comments button
  viewCommentsButton: {
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  viewCommentsText: {
    fontSize: 14,
    color: '#737373',
  },
});
