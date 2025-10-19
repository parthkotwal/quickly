import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

      {/* Instagram-style Feed */}
      <ScrollView
        style={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        pagingEnabled
        snapToInterval={SCREEN_WIDTH}
        decelerationRate="fast"
      >
        {feedPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No feed yet</Text>
            <Text style={styles.emptyText}>Start a new chat to generate your personalized learning feed!</Text>
          </View>
        ) : (
          feedPosts.map((post, index) => (
            <View key={index} style={styles.postContainer}>
              {/* Post Image */}
              <Image
                source={{ uri: post.imageUrl }}
                style={styles.postImage}
                resizeMode="cover"
              />

              {/* Gradient Overlay */}
              <View style={styles.gradientOverlay} />

              {/* Post Content */}
              <View style={styles.postContent}>
                {/* Music Info */}
                <View style={styles.musicInfo}>
                  <Ionicons name="musical-notes" size={16} color="#fff" />
                  <Text style={styles.musicText}>{post.musicTitle || 'Background Music'}</Text>
                </View>

                {/* Post Text */}
                <Text style={styles.postText}>{post.text}</Text>

                {/* Post Actions */}
                <View style={styles.postActions}>
                  <View style={styles.actionGroup}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => toggleLike(index)}
                    >
                      <Ionicons
                        name={post.isLiked ? "heart" : "heart-outline"}
                        size={28}
                        color={post.isLiked ? "#ef4444" : "#fff"}
                      />
                    </TouchableOpacity>
                    <Text style={styles.actionCount}>{formatNumber(post.likes)}</Text>
                  </View>

                  <View style={styles.actionGroup}>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="chatbubble-outline" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.actionCount}>{formatNumber(post.comments)}</Text>
                  </View>

                  <View style={styles.actionGroup}>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="share-outline" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.actionCount}>{formatNumber(post.shares)}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))
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
  postContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.5,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  postContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  musicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  musicText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  postText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: '500',
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
  },
  actionGroup: {
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 4,
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
