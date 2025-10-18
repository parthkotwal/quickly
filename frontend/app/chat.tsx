import { StyleSheet, View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import BottomTabBar from '@/components/BottomTabBar';

export default function ChatScreen() {
  const [email] = useState('user@example.com'); // This would come from auth context later
  const firstName = email.split('@')[0];

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
          <View style={styles.botMessageContainer}>
            <View style={styles.botMessage}>
              <Text style={styles.botMessageText}>Hi {firstName}! 👋</Text>
            </View>
          </View>
          <View style={styles.botMessageContainer}>
            <View style={styles.botMessage}>
              <Text style={styles.botMessageText}>How can I help you today?</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            multiline
          />
        </View>
      </KeyboardAvoidingView>

      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    alignItems: 'flex-start',
  },
  botMessage: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  botMessageText: {
    fontSize: 16,
    color: '#111827',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    maxHeight: 100,
  },
});
