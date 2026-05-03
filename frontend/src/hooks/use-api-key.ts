const STORAGE_KEY = "studymate.user_api_key";

export function getUserApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY) || null;
}

export function setUserApiKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearUserApiKey() {
  localStorage.removeItem(STORAGE_KEY);
}
