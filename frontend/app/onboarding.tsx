import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    icon: 'sparkles',
    title: 'Welcome to Quickly',
    description: 'Your personalized learning feed that adapts to your interests and education level',
    color: '#6366f1',
  },
  {
    id: 2,
    icon: 'phone-portrait',
    title: 'Swipe to Learn',
    description: 'Scroll through bite-sized educational content just like your favorite social apps',
    color: '#8b5cf6',
  },
  {
    id: 3,
    icon: 'heart',
    title: 'Like & Save',
    description: 'Tap the heart to save your favorite posts and access them anytime from your library',
    color: '#ec4899',
  },
  {
    id: 4,
    icon: 'chatbubbles',
    title: 'Create Custom Feeds',
    description: 'Use our AI chatbot to generate personalized learning feeds on any topic you want',
    color: '#10b981',
  },
  {
    id: 5,
    icon: 'document-text',
    title: 'Smart Flashcards',
    description: 'Upload your notes, diagrams, or photos and get AI-generated flashcards instantly',
    color: '#f59e0b',
  },
  {
    id: 6,
    icon: 'school',
    title: 'Test Yourself',
    description: 'Take quizzes based on your uploaded materials to reinforce what you\'ve learned',
    color: '#ec4899',
  },
  {
    id: 7,
    icon: 'rocket',
    title: 'Ready to Learn?',
    description: 'Your personalized feed is waiting. Let\'s start your learning journey!',
    color: '#8b5cf6',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('onboardingCompleted', 'true');
    router.replace('/chat');
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      {currentIndex < SLIDES.length - 1 && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => (
          <Animated.View
            key={slide.id}
            style={[
              styles.slide,
              { opacity: index === currentIndex ? fadeAnim : 1 },
            ]}
          >
            <View style={styles.content}>
              <View style={[styles.iconContainer, { backgroundColor: `${slide.color}20` }]}>
                <Ionicons name={slide.icon as any} size={80} color={slide.color} />
              </View>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Dots Indicator */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index === currentIndex ? '#6366f1' : '#e5e7eb',
                width: index === currentIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Next/Get Started Button */}
      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: SLIDES[currentIndex].color }]}
        onPress={handleNext}
        activeOpacity={0.8}
      >
        <Text style={styles.nextButtonText}>
          {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
        </Text>
        <Ionicons
          name={currentIndex === SLIDES.length - 1 ? 'rocket' : 'arrow-forward'}
          size={20}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skipText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  scrollView: { flex: 1 },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  content: { alignItems: 'center', justifyContent: 'center' },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  dot: { height: 8, borderRadius: 4 },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 48,
    paddingVertical: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
});
