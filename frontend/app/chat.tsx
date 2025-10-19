import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // Load feed data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadFeedData();
    }, [])
  );

  const loadFeedData = async () => {
    try {
      const storedPosts = await AsyncStorage.getItem('feedPosts');
      const storedTopics = await AsyncStorage.getItem('topics');

      if (storedPosts) {
        const posts = JSON.parse(storedPosts);
        // Add random engagement metrics to each post
        const postsWithMetrics = posts.map((post: any) => ({
          ...post,
          likes: Math.floor(Math.random() * 10000) + 100, // 100-10,100 likes
          comments: Math.floor(Math.random() * 500) + 10, // 10-510 comments
          shares: Math.floor(Math.random() * 200) + 5, // 5-205 shares
          isLiked: false, // Track if user liked
        }));
        setFeedPosts(postsWithMetrics);
      }
      if (storedTopics) {
        setTopics(JSON.parse(storedTopics));
      }
    } catch (error) {
      console.error('Error loading feed data:', error);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const toggleLike = (index: number): void => {
    setFeedPosts(prevPosts =>
      prevPosts.map((post, i) =>
        i === index
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1
            }
          : post
      )
    );
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
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="heart-outline" size={28} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
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
          {topics.map((topic, index) => (
            <TouchableOpacity
              key={index}
              style={styles.dropdownItem}
              onPress={() => {
                setDropdownVisible(false);
                // Load this topic's feed
              }}
            >
              <Ionicons name="book-outline" size={20} color="#111827" />
              <Text style={styles.dropdownText}>{topic}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Classic Instagram Feed */}
      <ScrollView
        style={styles.feedContainer}
        showsVerticalScrollIndicator={false}
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

                {/* Caption */}
                <View style={styles.captionContainer}>
                  <Text style={styles.captionText}>{post.text}</Text>
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
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingHorizontal: 20,
  },
  dropdownText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
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
