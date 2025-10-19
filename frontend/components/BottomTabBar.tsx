import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

export default function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { name: 'chat', icon: 'chatbubble' as IconName, iconOutline: 'chatbubble-outline' as IconName, route: '/chat' },
    { name: 'fyp', icon: 'flame' as IconName, iconOutline: 'flame-outline' as IconName, route: '/fyp' },
    { name: 'settings', icon: 'person' as IconName, iconOutline: 'person-outline' as IconName, route: '/settings' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.route;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => router.replace(tab.route)}
          >
            <Ionicons
              name={isActive ? tab.icon : tab.iconOutline}
              size={28}
              color={isActive ? '#6366f1' : '#9ca3af'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});
