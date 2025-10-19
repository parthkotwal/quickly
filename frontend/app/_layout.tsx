import { Stack } from "expo-router";
import { Amplify } from "aws-amplify";
import awsExports from "../src/aws-exports"; // adjust path if needed
Amplify.configure(awsExports);

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="chatbot" />
    </Stack>
  );
}
