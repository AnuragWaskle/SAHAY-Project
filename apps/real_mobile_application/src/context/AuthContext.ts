import { createContext, useContext } from 'react';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'citizen' | 'ngo' | 'super_admin';
  ward?: string;
  city?: string;
  xp?: number;
  level?: number;
  badges?: string[];
  civicCoins?: number;
  avatar_url?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  role: 'citizen' | 'ngo' | 'super_admin';
  setRole: (role: 'citizen' | 'ngo' | 'super_admin') => void;
  login: (userData: UserProfile, token?: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  role: 'citizen',
  setRole: () => {},
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);
