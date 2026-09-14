import { View } from "react-native";
import { Tabs } from "expo-router";
import {
  Home,
  Landmark,
  CreditCard,
  Receipt,
  Users,
} from "lucide-react-native";
import { AppHeader } from "@components/AppHeader";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";

// specs/mobile/00-overview.md §1 — <Tabs> do Expo Router.
// specs/design/tokens/elevation-radius-icons.md §3.4 — preenchido só na tab ativa.
//
// `AppHeader` fica fora do <Tabs>, num wrapper `<View>` acima dele, para
// aparecer só nas 5 tabs principais (Início/Contas/Cartões/Lançamentos/
// Família) — as telas empilhadas de detalhe/configurações já têm seus
// próprios headers nativos (ex. `settings/_layout.tsx`) e não devem repetir
// este header. O `<Tabs>` fica dentro de uma segunda `<View flex:1>` porque o
// componente do Expo Router não expõe uma prop `style` própria para
// preencher o espaço restante do `<View>` pai.
export default function TabsLayout() {
  const tokens = useTokens();

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg.app }}>
      <AppHeader />
      <View style={{ flex: 1 }}>
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
      </View>
    </View>
  );
}
