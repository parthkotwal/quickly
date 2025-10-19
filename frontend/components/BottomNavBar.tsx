import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import * as ImagePicker from "expo-image-picker";

interface BottomNavBarProps {
  onUpload?: () => void;
}

export default function BottomNavBar({ onUpload }: BottomNavBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const handleUpload = async () => {
    if (onUpload) {
      onUpload();
    }
  };

  return (
    <View style={styles.container}>
      {/* Home */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/chat")}
      >
        <Ionicons
          name={isActive("/chat") ? "home" : "home-outline"}
          size={28}
          color={isActive("/chat") ? "#6366f1" : "#6b7280"}
        />
      </TouchableOpacity>

      {/* New Chat */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/chatbot")}
      >
        <Ionicons
          name={isActive("/chatbot") ? "chatbubble" : "chatbubble-outline"}
          size={28}
          color={isActive("/chatbot") ? "#6366f1" : "#6b7280"}
        />
      </TouchableOpacity>

      {/* Search */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/search")}
      >
        <Ionicons
          name={isActive("/search") ? "search" : "search-outline"}
          size={28}
          color={isActive("/search") ? "#6366f1" : "#6b7280"}
        />
      </TouchableOpacity>

      {/* Upload */}
      <TouchableOpacity style={styles.navItem} onPress={handleUpload}>
        <Ionicons name="cloud-upload-outline" size={28} color="#6b7280" />
      </TouchableOpacity>

      {/* Profile */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/settings")}
      >
        <Ionicons
          name="person-circle"
          size={32}
          color={isActive("/settings") ? "#6366f1" : "#6b7280"}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingBottom: 20,
    paddingTop: 10,
    paddingHorizontal: 10,
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
