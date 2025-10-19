import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomTabBar from "@/components/BottomTabBar";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User signed out");
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const settingsOptions = [
    {
      icon: "person-outline",
      title: "Account",
      subtitle: "Manage your account",
    },
    {
      icon: "notifications-outline",
      title: "Notifications",
      subtitle: "Configure notifications",
    },
    {
      icon: "lock-closed-outline",
      title: "Privacy",
      subtitle: "Privacy settings",
    },
    {
      icon: "help-circle-outline",
      title: "Help & Support",
      subtitle: "Get help",
    },
    {
      icon: "information-circle-outline",
      title: "About",
      subtitle: "App information",
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#6366f1" />
          </View>
          <Text style={styles.userName}>user@example.com</Text>
        </View>

        <View style={styles.settingsList}>
          {settingsOptions.map((option, index) => (
            <TouchableOpacity key={index} style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <Ionicons name={option.icon as any} size={24} color="#6b7280" />
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

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff", // White background for settings
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
    color: "#111827", // Black text for header
    fontFamily: "CodecPro",
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1b17ff", // Vivid Blue avatar background
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827", // Black text for username
    fontFamily: "CodecPro",
  },
  settingsList: {
    backgroundColor: "#fff",
    marginTop: 20,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  settingsItemText: {
    gap: 2,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b17ff", // Vivid Blue for settings item title
    fontFamily: "CodecPro",
  },
  settingsItemSubtitle: {
    fontSize: 14,
    color: "#111827", // Black for subtitle
    fontFamily: "CodecPro",
  },
  logoutButton: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1b17ff", // Vivid Blue border for logout
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b17ff", // Vivid Blue for logout text
    fontFamily: "CodecPro",
  },
});
