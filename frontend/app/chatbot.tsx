import { StyleSheet, View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Modal, Animated } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export default function ChatbotScreen() {
  const router = useRouter();
  const { topic: editTopic } = useLocalSearchParams();

  const [previousPrompt] = useState(editTopic ? editTopic.toString() : '');
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! How can I assist you today?', isBot: true },
  ]);
  const [inputText, setInputText] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    loadTopics();
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: sidebarVisible ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [sidebarVisible]);

  const loadTopics = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        const topicsResponse = await fetch(`${API_URL}/getTopics?userId=${userId}`);
        const topicsData = await topicsResponse.json();
        if (topicsResponse.ok && topicsData.topics) {
          setTopics(topicsData.topics);
        }
      }
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  const deleteFeed = async (topic: string) => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const response = await fetch(`${API_URL}/deleteFeed?userId=${userId}&topic=${encodeURIComponent(topic)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadTopics();
      }
    } catch (error) {
      console.error('Error deleting feed:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !previousPrompt) return;

    let finalPrompt = inputText.trim();
    if (previousPrompt && inputText.trim()) {
      finalPrompt = `Original topic: ${previousPrompt}\nAdd or expand on this with: ${inputText.trim()}`;
    } else if (previousPrompt && !inputText.trim()) {
      finalPrompt = previousPrompt;
    }

    const userMessage = { id: Date.now(), text: finalPrompt, isBot: false };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsGenerating(true);
    setProgress(0);
    setProgressText('Starting...');

    const loadingMessage = { id: Date.now() + 1, text: 'Generating your personalized learning feed...', isBot: true };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      // Simulate progress updates (8 posts total)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const next = Math.min(prev + 0.02, 0.95);
          if (next < 0.2) setProgressText('Generating image queries...');
          else if (next < 0.5) setProgressText('Fetching images...');
          else if (next < 0.8) setProgressText('Creating captions...');
          else setProgressText('Finalizing posts...');
          return next;
        });
      }, 100);

      const response = await fetch(`${API_URL}/generateFeed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: finalPrompt }),
      });

      clearInterval(progressInterval);
      setProgress(1);
      setProgressText('Complete!');

      const data = await response.json();
      if (response.ok) {
        const userId = await AsyncStorage.getItem('userId');
        const username = await AsyncStorage.getItem('username') || userId?.slice(0, 8);

        await fetch(`${API_URL}/saveFeedPosts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            topic: previousPrompt || finalPrompt,
            posts: data.posts,
            username,
            isPrivate: false,
          }),
        });

        setMessages(prev => prev.slice(0, -1).concat([
          { id: Date.now() + 2, text: `Great! I've ${previousPrompt ? 'expanded' : 'created'} your feed with 8 posts for "${previousPrompt || finalPrompt}". Redirecting to your feed...`, isBot: true }
        ]));

        setTimeout(() => {
          setIsGenerating(false);
          setProgress(0);
          router.replace({
            pathname: '/chat',
            params: { newTopic: previousPrompt || finalPrompt }
          });
        }, 1500);
      } else {
        clearInterval(progressInterval);
        setIsGenerating(false);
        setProgress(0);
        setMessages(prev => prev.slice(0, -1).concat([
          { id: Date.now() + 2, text: `Sorry, I encountered an error: ${data.error}`, isBot: true }
        ]));
      }
    } catch (error) {
      setIsGenerating(false);
      setProgress(0);
      setMessages(prev => prev.slice(0, -1).concat([
        { id: Date.now() + 2, text: 'Sorry, I could not connect to the server. Please make sure the backend is running.', isBot: true }
      ]));
    }
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
          <Text style={styles.headerTitle}>{previousPrompt ? 'Editing Feed' : 'New Chat'}</Text>
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

      {/* Previous Prompt Box */}
      {previousPrompt ? (
        <View style={styles.previousPromptBox}>
          <Text style={styles.previousPromptLabel}>Previous Topic:</Text>
          <Text style={styles.previousPromptText}>{previousPrompt}</Text>
        </View>
      ) : null}

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
              <TouchableOpacity
                onPress={() => setSidebarVisible(false)}
                activeOpacity={0.7}
              >
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
                style={styles.sidebarItem}
                onPress={() => {
                  setSidebarVisible(false);
                  router.replace('/chat');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="globe" size={20} color="#6b7280" />
                <Text style={styles.sidebarItemText}>Public Feed</Text>
              </TouchableOpacity>

              {topics.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 20 }]}>MY TOPICS</Text>
                  {topics.map((topic, index) => (
                    <View key={index} style={styles.sidebarItemRow}>
                      <TouchableOpacity
                        style={[styles.sidebarItem, previousPrompt === topic && styles.sidebarItemActive, styles.sidebarItemWithDelete]}
                        onPress={() => {
                          setSidebarVisible(false);
                          router.push({ pathname: '/chatbot', params: { topic } });
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="book" size={20} color={previousPrompt === topic ? "#6366f1" : "#6b7280"} />
                        <Text style={[styles.sidebarItemText, previousPrompt === topic && styles.sidebarItemTextActive]} numberOfLines={1}>
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

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.isBot ? styles.botMessageContainer : styles.userMessageContainer,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.isBot ? styles.botBubble : styles.userBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.isBot ? styles.botText : styles.userText,
                  ]}
                >
                  {message.text}
                </Text>
                {isGenerating && message.text.includes('Generating') && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarBackground}>
                      <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                      {progressText} {Math.round(progress * 100)}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your edits or add-ons..."
            placeholderTextColor="#9ca3af"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() && !previousPrompt}
            activeOpacity={0.8}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() || previousPrompt ? '#fff' : '#9ca3af'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconButton: { padding: 4 },

  previousPromptBox: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 10
  },
  previousPromptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 2
  },
  previousPromptText: {
    fontSize: 15,
    color: '#1f2937'
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
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingHorizontal: 20 },
  dropdownText: { fontSize: 16, color: '#111827', fontWeight: '500' },
  content: { flex: 1 },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, gap: 12, flexGrow: 1, justifyContent: 'flex-end' },
  messageContainer: { marginVertical: 4 },
  botMessageContainer: { alignItems: 'flex-start' },
  userMessageContainer: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '80%', borderRadius: 16, padding: 12, paddingHorizontal: 16 },
  botBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  userBubble: { backgroundColor: '#6366f1' },
  messageText: { fontSize: 16, lineHeight: 22 },
  botText: { color: '#111827' },
  userText: { color: '#fff' },
  loadingContainer: { marginTop: 12, alignItems: 'center' },
  progressContainer: {
    marginTop: 16,
    width: '100%',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 16, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8
  },
  input: {
    flex: 1, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#111827', maxHeight: 100
  },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: '#e5e7eb' },
});
