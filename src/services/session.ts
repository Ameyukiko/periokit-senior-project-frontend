import router from "../router";
import { useNotificationStore } from "../stores/notification";
import { clearSessionStorage } from "./token-storage";

type SessionClearListener = () => void;
type ApolloResetHandler = () => Promise<void>;

const sessionClearListeners = new Set<SessionClearListener>();
let apolloResetHandler: ApolloResetHandler | null = null;
let isHandlingUnauthorized = false;

export function registerSessionClearListener(
  listener: SessionClearListener,
): () => void {
  sessionClearListeners.add(listener);
  return () => sessionClearListeners.delete(listener);
}

export function registerApolloResetHandler(handler: ApolloResetHandler): void {
  apolloResetHandler = handler;
}

async function resetApolloCache(): Promise<void> {
  if (!apolloResetHandler) {
    return;
  }

  try {
    await apolloResetHandler();
  } catch (error) {
    console.error("Apollo reset error:", error);
  }
}

function notifySessionCleared(): void {
  sessionClearListeners.forEach((listener) => listener());
}

export async function clearClientSession(): Promise<void> {
  clearSessionStorage();
  sessionStorage.clear();
  notifySessionCleared();
  await resetApolloCache();
}

export async function handleUnauthorizedSession(): Promise<void> {
  if (isHandlingUnauthorized || router.currentRoute.value.name === "login") {
    return;
  }

  isHandlingUnauthorized = true;

  try {
    await clearClientSession();

    const notificationStore = useNotificationStore();
    notificationStore.error("Please login again (Session expired)");

    await router.push({ name: "login" });
  } finally {
    isHandlingUnauthorized = false;
  }
}
