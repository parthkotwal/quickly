import { StyleSheet, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Navigate to login after 2 seconds
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quickly</Text>
      <Text style={styles.subtitle}>
        Your Feed Just Got <Text style={styles.smarterText}>Smarter</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#e0e7ff',
  },
  smarterText: {
    fontWeight: '900',
    color: '#fff',
    fontStyle: 'italic',
  },
});
