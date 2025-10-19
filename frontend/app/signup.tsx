// app/signup.tsx
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match", "Please re-enter your passwords.");
      return;
    }
    if (!email || !password) {
      Alert.alert("Missing Info", "Please fill in all fields.");
      return;
    }

    // Pass credentials to interests screen
    router.push({
      pathname: "/interests",
      params: { email, password },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to get started</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleContinue}
          >
            <Text style={styles.signupButtonText}>
              {loading ? "Loading..." : "Continue"}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // White background for signup
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827', // Black text for title
    marginBottom: 8,
    fontFamily: 'CodecPro',
  },
  subtitle: {
    fontSize: 16,
    color: '#1b17ff', // Vivid Blue for subtitle
    marginBottom: 32,
    fontFamily: 'CodecPro',
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827', // Vivid Blue for label
    fontFamily: 'CodecPro',
  },
  input: {
    backgroundColor: '#f9fafb', // Light background for input
    borderWidth: 1,
    borderColor: '#1b17ff', // Vivid Blue border
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#111827', // Black text for input
    fontFamily: 'CodecPro',
  },
  signupButton: {
    backgroundColor: '#1b17ff', // Vivid Blue button
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonText: {
    color: '#fff', // White text for button
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'CodecPro',
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
    color: '#111827', // Black text for signup
    fontFamily: 'CodecPro',
  },
  loginLink: {
    fontSize: 14,
    color: '#1b17ff', // Vivid Blue for signup link
    fontWeight: '600',
    fontFamily: 'CodecPro',
  },
});
