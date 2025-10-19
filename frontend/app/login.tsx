// app/login.tsx
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
import { signIn } from "aws-amplify/auth";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const { isSignedIn } = await signIn({ username: email, password });
      console.log("✅ Cognito sign-in success:", isSignedIn);

      router.replace("/chat");
    } catch (error: any) {
      console.error("❌ Login error:", error);
      Alert.alert("Login failed", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

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

          <TouchableOpacity>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>
              {loading ? "Signing In..." : "Sign In"}
            </Text>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/signup")}>
              <Text style={styles.signupLink}>Sign Up</Text>
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
    backgroundColor: '#fff', // White background for login/signup
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
    color: '#1b17ff', // Black text for subtitle
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
    color: '#111827', // Black for label
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
  forgotPassword: {
    fontSize: 14,
    color: '#1b17ff', // Vivid Blue for forgot password
    textAlign: 'right',
    fontWeight: '600',
    fontFamily: 'CodecPro',
  },
  loginButton: {
    backgroundColor: '#1b17ff', // Vivid Blue button
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff', // White text for button
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'CodecPro',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: '#111827', // Black text for signup
    fontFamily: 'CodecPro',
  },
  signupLink: {
    fontSize: 14,
    color: '#1b17ff', // Vivid Blue for signup link
    fontWeight: '600',
    fontFamily: 'CodecPro',
  },
});
