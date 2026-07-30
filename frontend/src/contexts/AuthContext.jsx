import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

const AuthContext = createContext({
  user: null,
  loading: true,
  authType: null,
  isAuthenticated: false,
  loginWithGoogle: () => {},
  loginWithOtp: () => {},
  updateUser: () => {},
  logout: () => {},
});

const USER_DATA_KEY = 'userData';
const AUTH_TYPE_KEY = 'authType';
const USER_EMAIL_KEY = 'userEmail';
const OTP_TOKEN_KEY = 'token';

function clearStoredAuth() {
  localStorage.removeItem(USER_DATA_KEY);
  localStorage.removeItem(AUTH_TYPE_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(OTP_TOKEN_KEY);
  localStorage.removeItem('isOtpLogged');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authType, setAuthType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedAuthType = localStorage.getItem(AUTH_TYPE_KEY);
        const storedUserData = localStorage.getItem(USER_DATA_KEY);

        if (storedAuthType === 'otp') {
          if (storedUserData) {
            setUser(JSON.parse(storedUserData));
            setAuthType('otp');
          }
          setLoading(false);
          return;
        }

        const resolveFirebaseUser = () =>
          new Promise((resolve) => {
            if (auth.currentUser) {
              resolve(auth.currentUser);
              return;
            }

            const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
              unsubscribe();
              resolve(firebaseUser);
            });
          });

        const firebaseUser = await resolveFirebaseUser();

        if (firebaseUser) {
          setAuthType('google');
          if (storedUserData) {
            setUser(JSON.parse(storedUserData));
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        clearStoredAuth();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    const handleStorageEvent = (event) => {
      if (event.storageArea !== localStorage) return;

      if (event.key === USER_DATA_KEY) {
        if (event.newValue) {
          try {
            setUser(JSON.parse(event.newValue));
          } catch (error) {
            console.error('Invalid userData in localStorage:', error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }

      if (event.key === AUTH_TYPE_KEY) {
        setAuthType(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  const updateUser = (nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(nextUser));
    }
  };

  const loginWithGoogle = (nextUser) => {
    setAuthType('google');
    updateUser(nextUser);
    localStorage.setItem(AUTH_TYPE_KEY, 'google');
    if (nextUser?.email) {
      localStorage.setItem(USER_EMAIL_KEY, nextUser.email);
    }
  };

  const loginWithOtp = (token, email, nextUser) => {
    setAuthType('otp');
    updateUser(nextUser);
    localStorage.setItem(AUTH_TYPE_KEY, 'otp');
    localStorage.setItem(OTP_TOKEN_KEY, token);
    if (email) {
      localStorage.setItem(USER_EMAIL_KEY, email);
    }
  };

  const logout = async () => {
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch (error) {
      console.warn('Firebase sign-out failed:', error);
    } finally {
      clearStoredAuth();
      setUser(null);
      setAuthType(null);
    }
  };

  const value = {
    user,
    loading,
    authType,
    isAuthenticated: Boolean(user),
    loginWithGoogle,
    loginWithOtp,
    updateUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
