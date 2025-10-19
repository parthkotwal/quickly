import { StyleSheet, View, Text, Image } from 'react-native';
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
      <Image source={require('../assets/logo.png')} style={styles.logo} />
      {/* <Text style={styles.title}>Quickly</Text> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 350,
    height: 350,
    marginBottom: 0,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'CodecPro',
    marginBottom: 8,
  },
});
