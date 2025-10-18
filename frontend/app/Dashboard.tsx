// app/dashboard.tsx
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useRouter } from "expo-router";

export default function Dashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to your Dashboard 🎉</Text>
      <Text style={styles.subtitle}>
        You’re successfully signed in as {auth.currentUser?.email}
      </Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 24,
  },
  logoutButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
