export type {
  Account,
  AccountType,
  ConnectionStatus,
  CreateOpenFinanceConnectionInput,
  OpenFinanceConnection,
  PluggyConnectToken,
} from "@app-types/graphql-generated";

// Mensagem repassada pelo script injetado na WebView do Pluggy Connect (ver
// SUPOSIÇÃO em `services/pluggyWidget.ts`) para o app React Native via
// `window.ReactNativeWebView.postMessage(...)`.
export type PluggyWidgetMessage =
  | { type: "SUCCESS"; itemId: string }
  | { type: "ERROR"; message?: string }
  | { type: "CLOSE" };
