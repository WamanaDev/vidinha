# `apps/mobile/src/lib/secureStorage.ts`

Wrapper tipado sobre Expo SecureStore. `claude.md` §34 / `00-DECISIONS.md` §5: tokens e dados sensíveis SOMENTE aqui, nunca em AsyncStorage puro.

Usado por `@lib/authContext.tsx` e `@lib/graphqlClient.ts` (ver [`graphql-client.md`](./graphql-client.md)) para persistir/limpar sessão e a família ativa selecionada.

```typescript
import * as SecureStore from 'expo-secure-store';

/**
 * Wrapper tipado sobre Expo SecureStore.
 * claude.md §34 / 00-DECISIONS.md §5: tokens e dados sensíveis SOMENTE aqui,
 * nunca em AsyncStorage puro.
 */

export const SECURE_STORE_KEYS = {
  SUPABASE_SESSION: 'vidinha.supabase.session',
  ACTIVE_FAMILY_ID: 'vidinha.activeFamilyId',
} as const;

export type SecureStoreKey = (typeof SECURE_STORE_KEYS)[keyof typeof SECURE_STORE_KEYS];

const DEFAULT_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

class SecureStorage {
  async getItem(key: SecureStoreKey): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key, DEFAULT_OPTIONS);
    } catch (error) {
      // Nunca lançar exceção crua para a UI (claude.md §31) — trata como "sem valor".
      console.warn(`[secureStorage] falha ao ler "${key}"`, error);
      return null;
    }
  }

  async setItem(key: SecureStoreKey, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, DEFAULT_OPTIONS);
    } catch (error) {
      console.warn(`[secureStorage] falha ao gravar "${key}"`, error);
      throw error;
    }
  }

  async removeItem(key: SecureStoreKey): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key, DEFAULT_OPTIONS);
    } catch (error) {
      console.warn(`[secureStorage] falha ao remover "${key}"`, error);
    }
  }

  async getJSON<T>(key: SecureStoreKey): Promise<T | null> {
    const raw = await this.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJSON<T>(key: SecureStoreKey, value: T): Promise<void> {
    await this.setItem(key, JSON.stringify(value));
  }

  /** Limpa todas as chaves conhecidas — usado no logout (fail-safe local, 02-API-AUTH.md §1.6). */
  async clearAll(): Promise<void> {
    await Promise.all(
      Object.values(SECURE_STORE_KEYS).map((key) => this.removeItem(key)),
    );
  }
}

export const secureStorage = new SecureStorage();
```
