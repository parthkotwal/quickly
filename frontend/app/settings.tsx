import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomNavBar from "../components/BottomNavBar";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut, updateProfile, updateEmail, updatePassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { API_URL } from "../config";

export default function SettingsScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [topicCount, setTopicCount] = useState(0);
  const [likedCount, setLikedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [editNameModal, setEditNameModal] = useState(false);
  const [editEmailModal, setEditEmailModal] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      const storedUserId = await AsyncStorage.getItem('userId');

      if (user) {
        setUserEmail(user.email || "");
        setUserName(user.displayName || "User");
        setUserId(storedUserId || user.uid);

        // Load topics count
        if (storedUserId) {
          const topicsResponse = await fetch(`${API_URL}/getTopics?userId=${storedUserId}`);
          const topicsData = await topicsResponse.json();
          if (topicsResponse.ok && topicsData.topics) {
            setTopicCount(topicsData.topics.length);
          }

          // Load liked posts count
          const likedResponse = await fetch(`${API_URL}/getLikedPosts?userId=${storedUserId}`);
          const likedData = await likedResponse.json();
          if (likedResponse.ok && likedData.posts) {
            setLikedCount(likedData.posts.length);
          }
        }
      }
    } catch (error) {
      console.error("Error loading user info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      Alert.alert("Error", "Please enter a name");
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, { displayName: newName });
        setUserName(newName);
        setEditNameModal(false);
        setNewName("");
        Alert.alert("Success", "Name updated successfully");
      }
    } catch (error) {
      console.error("Error updating name:", error);
      Alert.alert("Error", "Failed to update name");
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert("Error", "Please enter an email");
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        await updateEmail(user, newEmail);
        setUserEmail(newEmail);
        setEditEmailModal(false);
        setNewEmail("");
        Alert.alert("Success", "Email updated successfully");
      }
    } catch (error: any) {
      console.error("Error updating email:", error);
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert("Error", "Please log out and log back in to update your email");
      } else {
        Alert.alert("Error", "Failed to update email");
      }
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, newPassword);
        setChangePasswordModal(false);
        setNewPassword("");
        setConfirmPassword("");
        Alert.alert("Success", "Password changed successfully");
      }
    } catch (error: any) {
      console.error("Error changing password:", error);
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert("Error", "Please log out and log back in to change your password");
      } else {
        Alert.alert("Error", "Failed to change password");
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              await AsyncStorage.removeItem('userId');
              console.log("User signed out");
              router.replace("/login");
            } catch (error) {
              console.error("Logout error:", error);
            }
          }
        }
      ]
    );
  };

  const accountOptions = [
    {
      icon: "person-outline",
      title: "Edit Name",
      subtitle: userName,
      onPress: () => {
        setNewName(userName);
        setEditNameModal(true);
      },
    },
    {
      icon: "mail-outline",
      title: "Email Address",
      subtitle: userEmail,
      onPress: () => {
        setNewEmail(userEmail);
        setEditEmailModal(true);
      },
    },
    {
      icon: "key-outline",
      title: "Change Password",
      subtitle: "Update your password",
      onPress: () => setChangePasswordModal(true),
    },
  ];

  const appOptions = [
    {
      icon: "book-outline",
      title: "My Learning Topics",
      subtitle: `${topicCount} topics created`,
      onPress: () => router.push("/chatbot"),
    },
    {
      icon: "heart-outline",
      title: "Liked Posts",
      subtitle: `${likedCount} posts saved`,
      onPress: () => router.push("/liked"),
    },
    {
      icon: "refresh-outline",
      title: "Restart Walkthrough",
      subtitle: "See the app tutorial again",
      onPress: async () => {
        await AsyncStorage.removeItem('walkthroughCompleted');
        router.push('/walkthrough');
      },
    },
  ];

  const supportOptions = [
    {
      icon: "help-circle-outline",
      title: "Help & Support",
      subtitle: "Get help with the app",
      onPress: () => Alert.alert("Support", "Contact us at support@quickly.com"),
    },
    {
      icon: "information-circle-outline",
      title: "About Quickly",
      subtitle: "Version 1.0.0",
      onPress: () => Alert.alert("About", "Quickly - Your personalized learning feed"),
    },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{topicCount}</Text>
              <Text style={styles.statLabel}>Topics</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{likedCount}</Text>
              <Text style={styles.statLabel}>Liked</Text>
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.settingsList}>
            {accountOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.settingsItem}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.settingsItemLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={option.icon as any} size={22} color="#6366f1" />
                  </View>
                  <View style={styles.settingsItemText}>
                    <Text style={styles.settingsItemTitle}>{option.title}</Text>
                    <Text style={styles.settingsItemSubtitle}>
                      {option.subtitle}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>APP</Text>
          <View style={styles.settingsList}>
            {appOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.settingsItem}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.settingsItemLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={option.icon as any} size={22} color="#6366f1" />
                  </View>
                  <View style={styles.settingsItemText}>
                    <Text style={styles.settingsItemTitle}>{option.title}</Text>
                    <Text style={styles.settingsItemSubtitle}>
                      {option.subtitle}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Support */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <View style={styles.settingsList}>
            {supportOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.settingsItem}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.settingsItemLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={option.icon as any} size={22} color="#6366f1" />
                  </View>
                  <View style={styles.settingsItemText}>
                    <Text style={styles.settingsItemTitle}>{option.title}</Text>
                    <Text style={styles.settingsItemSubtitle}>
                      {option.subtitle}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={editNameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter your name"
              value={newName}
              onChangeText={setNewName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setEditNameModal(false);
                  setNewName("");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleUpdateName}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonTextConfirm}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Email Modal */}
      <Modal visible={editEmailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Email</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter new email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newEmail}
              onChangeText={setNewEmail}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setEditEmailModal(false);
                  setNewEmail("");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleUpdateEmail}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonTextConfirm}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={changePasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="New password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setChangePasswordModal(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleChangePassword}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonTextConfirm}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    color: "#6b7280",
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6366f1",
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#e5e7eb",
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 1,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  settingsList: {
    backgroundColor: "#fff",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsItemText: {
    gap: 2,
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  settingsItemSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    margin: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#ef4444",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ef4444",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#f9fafb",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f3f4f6",
  },
  modalButtonConfirm: {
    backgroundColor: "#6366f1",
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
