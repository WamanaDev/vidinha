import { Tabs } from "expo-router";
import {
  Home,
  Landmark,
  CreditCard,
  Receipt,
  Users,
} from "lucide-react-native";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";

// specs/mobile/00-overview.md §1 — <Tabs> do Expo Router.
// specs/design/tokens/elevation-radius-icons.md §3.4 — preenchido só na tab ativa.
export default function TabsLayout() {
  const tokens = useTokens();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.icon.active,
        tabBarInactiveTintColor: tokens.icon.muted,
        tabBarStyle: {
          backgroundColor: tokens.bg.surface,
          borderTopColor: tokens.border.default,
        },
        tabBarLabelStyle: typeScale.labelSm,
        tabBarAllowFontScaling: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} strokeWidth={1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Contas",
          tabBarIcon: ({ color, size }) => (
            <Landmark color={color} size={size} strokeWidth={1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: "Cartões",
          tabBarIcon: ({ color, size }) => (
            <CreditCard color={color} size={size} strokeWidth={1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Lançamentos",
          tabBarIcon: ({ color, size }) => (
            <Receipt color={color} size={size} strokeWidth={1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: "Família",
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size} strokeWidth={1.75} />
          ),
        }}
      />
    </Tabs>
  );
}
