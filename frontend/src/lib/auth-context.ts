import { createContext, useContext } from "react";

interface AuthContextType {
  user: { name: string; email: string } | null;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({ user: null, logout: () => {} });
export const useAuth = () => useContext(AuthContext);
