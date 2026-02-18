import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setTokenState] = useState(() => localStorage.getItem('auth_token'));

    const setToken = useCallback((t) => {
        setTokenState(t);
        if (t) localStorage.setItem('auth_token', t);
        else localStorage.removeItem('auth_token');
    }, []);

    // Check for token in URL (from OAuth redirect)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        if (urlToken) {
            setToken(urlToken);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [setToken]);

    // Fetch current user when token changes
    useEffect(() => {
        if (!token) { setUser(null); setLoading(false); return; }
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) setUser(await res.json());
                else { setToken(null); setUser(null); }
            } catch { setToken(null); setUser(null); }
            finally { setLoading(false); }
        })();
    }, [token, setToken]);

    // Facebook login
    const loginFacebook = () => {
        window.location.href = `${API_BASE}/auth/facebook`;
    };

    // Local login
    const loginLocal = async (username, password) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        setToken(data.token);
        setUser(data.user);
        return data;
    };

    // Register
    const register = async (username, password, name, email) => {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, name, email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        setToken(data.token);
        setUser(data.user);
        return data;
    };

    const logout = () => { setToken(null); setUser(null); };

    const value = {
        user, token, loading,
        isLoggedIn: !!user,
        isAdmin: user?.role === 'admin',
        loginFacebook, loginLocal, register, logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
