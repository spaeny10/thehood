import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const API_BASE = 'http://localhost:3001/api';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setTokenState] = useState(() => localStorage.getItem('auth_token'));

    const setToken = useCallback((t) => {
        setTokenState(t);
        if (t) {
            localStorage.setItem('auth_token', t);
        } else {
            localStorage.removeItem('auth_token');
        }
    }, []);

    // Check for token in URL (from OAuth redirect)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        if (urlToken) {
            setToken(urlToken);
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [setToken]);

    // Fetch current user when token changes
    useEffect(() => {
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const res = await fetch(`${API_BASE}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                } else {
                    setToken(null);
                    setUser(null);
                }
            } catch {
                setToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [token, setToken]);

    const login = () => {
        window.location.href = `${API_BASE}/auth/facebook`;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
    };

    const value = {
        user,
        token,
        loading,
        isLoggedIn: !!user,
        isAdmin: user?.role === 'admin',
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
