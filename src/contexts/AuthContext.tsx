import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  user: { email: string } | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    // Check for existing session on app load
    const savedSession = localStorage.getItem('authSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setAuthState({
          isAuthenticated: true,
          user: session.user,
          isLoading: false,
        });
      } catch {
        localStorage.removeItem('authSession');
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Placeholder login function - replace with actual authentication logic
  const login = async (email: string, password: string): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Placeholder validation - replace with actual authentication
    if (email && password) {
      const user = { email };
      const session = { user, timestamp: Date.now() };
      
      localStorage.setItem('authSession', JSON.stringify(session));
      setAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
      });
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw new Error('Invalid email or password');
    }
  };

  const logout = () => {
    localStorage.removeItem('authSession');
    setAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
    });
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};