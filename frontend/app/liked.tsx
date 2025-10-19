import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_CONTAINER_HEIGHT = 400;

interface LikedPost {
  postId: string;
  text: string;
  imageUrl: string;
  topic: string;
  likedAt: string;
}

export default function LikedPostsScreen() {
  const router = useRouter();
  const [likedPosts, setLikedPosts] = useState<LikedPost[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadLikedPosts();
    }, [])
  );

  const loadLikedPosts = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        console.log('No user ID found');
        return;
      }

      const response = await fetch(`${API_URL}/getLikedPosts?userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setLikedPosts(data.posts || []);
      } else {
        console.error('Error loading liked posts:', data.error);
      }
    } catch (error) {
      console.error('Error loading liked posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlike = async (postId: string) => {
    try {
      const userId = await AsyncStorage.getItem('userId');

      const response = await fetch(`${API_URL}/toggleLike`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          postId,
          action: 'unlike',
        }),
      });

      if (response.ok) {
        // Remove from local state
        setLikedPosts(likedPosts.filter(post => post.postId !== postId));
      }
    } catch (error) {
      console.error('Error unliking post:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Liked Posts</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="person-circle" size={32} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : likedPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No liked posts yet</Text>
            <Text style={styles.emptyText}>Posts you like will appear here</Text>
          </View>
        ) : (
          likedPosts.map((post, index) => (
            <View key={index} style={styles.postContainer}>
              {/* Image */}
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: post.imageUrl }}
                  style={styles.postImage}
                  resizeMode="contain"
                />
              </View>

              {/* Actions */}
              <View style={styles.postActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUnlike(post.postId)}
                >
                  <Ionicons name="heart" size={28} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {/* Caption */}
              <View style={styles.captionContainer}>
                <Text style={styles.topicBadge}>{post.topic}</Text>
                <Text style={styles.captionText}>{post.text}</Text>
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
    backgroundColor: '#fff',
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  content: {
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
    marginBottom: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
    paddingBottom: 16,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_CONTAINER_HEIGHT,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionButton: {
    padding: 4,
  },
  captionContainer: {
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  topicBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  captionText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
});
