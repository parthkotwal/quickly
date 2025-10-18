import { StyleSheet, View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Modal } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ChatScreen() {
  const router = useRouter();
  const [email] = useState('user@example.com'); // This would come from auth context later
  const firstName = email.split('@')[0];
  const [dropdownVisible, setDropdownVisible] = useState(false);

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
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.helloText}>Hello World</Text>
      </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helloText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
});
