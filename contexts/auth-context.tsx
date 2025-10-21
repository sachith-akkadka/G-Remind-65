// contexts/auth-context.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "expo-router";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signup: async () => { throw new Error("signup not implemented"); },
  login: async () => { throw new Error("login not implemented"); },
  logout: async () => { throw new Error("logout not implemented"); },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/";

    if (!user && !isAuthPage) {
      router.replace("/login");
    }
    if (user && isAuthPage) {
      router.replace("/tasks/page");
    }
  }, [user, loading, pathname]);

  const signup = async (email: string, password: string): Promise<User> => {
    const cred: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const login = async (email: string, password: string): Promise<User> => {
    const cred: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);