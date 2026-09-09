import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { graphqlRequest } from "./graphqlClient";
import { secureStorage, SECURE_STORE_KEYS } from "./secureStorage";
import { lightTokens } from "@config/theme/tokens";

// SUPOSIÇÃO: o SDL exato de `myFamilies` (nomes de campo) ainda não foi lido
// desta spec de API — assumida a forma mínima abaixo (id + name), suficiente
// para decidir se o usuário tem família ativa e listar num FamilySwitcher
// futuro. Ajustar quando `specs/backend`/`02-API-AUTH.md` confirmar o shape
// definitivo; nenhuma tela além deste provider depende disso.
const MY_FAMILIES_QUERY = /* GraphQL */ `
  query MyFamilies {
    myFamilies {
      id
      name
    }
  }
`;

interface FamilySummary {
  id: string;
  name: string;
}

interface MyFamiliesResult {
  myFamilies: FamilySummary[];
}

interface ActiveFamilyContextValue {
  familyId: string;
  families: FamilySummary[];
  setActiveFamilyId: (id: string) => void;
}

const ActiveFamilyContext = createContext<ActiveFamilyContextValue | undefined>(
  undefined,
);

export function ActiveFamilyProvider({ children }: { children: ReactNode }) {
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["myFamilies"],
    queryFn: () => graphqlRequest<MyFamiliesResult>(MY_FAMILIES_QUERY),
  });

  useEffect(() => {
    secureStorage.getItem(SECURE_STORE_KEYS.ACTIVE_FAMILY_ID).then((stored) => {
      setActiveFamilyIdState(stored);
      setHydrated(true);
    });
  }, []);

  const setActiveFamilyId = (id: string) => {
    setActiveFamilyIdState(id);
    secureStorage.setItem(SECURE_STORE_KEYS.ACTIVE_FAMILY_ID, id);
  };

  if (isLoading || !hydrated) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: lightTokens.bg.app,
        }}
      >
        <ActivityIndicator size="large" color={lightTokens.action.primary.bg} />
      </View>
    );
  }

  const families = data?.myFamilies ?? [];

  if (families.length === 0) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  const familyId =
    activeFamilyId && families.some((f) => f.id === activeFamilyId)
      ? activeFamilyId
      : families[0]!.id;

  return (
    <ActiveFamilyContext.Provider
      value={{ familyId, families, setActiveFamilyId }}
    >
      {children}
    </ActiveFamilyContext.Provider>
  );
}

export function useActiveFamily(): ActiveFamilyContextValue {
  const ctx = useContext(ActiveFamilyContext);
  if (!ctx) {
    throw new Error(
      "useActiveFamily deve ser usado dentro de <ActiveFamilyProvider>",
    );
  }
  return ctx;
}
