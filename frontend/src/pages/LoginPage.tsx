import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../lib/api';
import { Lock, Key } from 'lucide-react';

export default function LoginPage() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setTokens } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(apiKey);
      const { accessToken, refreshToken } = response.data;
      setTokens(accessToken, refreshToken);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <Lock size={48} color="#1d9bf0" />
          <h1 style={styles.title}>Multi-Tenant AI Chat</h1>
          <p style={styles.subtitle}>Enter your API key to continue</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <Key size={20} style={styles.icon} />
            <input
              type="password"
              placeholder="API Key (tenant or user key)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={styles.input}
              disabled={loading}
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Don't have an API key? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%)',
    padding: '20px',
  },
  card: {
    background: '#16181c',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '440px',
    width: '100%',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginTop: '16px',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#8b98a5',
    fontSize: '15px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    left: '16px',
    color: '#8b98a5',
  },
  input: {
    width: '100%',
    padding: '14px 14px 14px 48px',
    background: '#0f1419',
    border: '1px solid #2f3336',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#1d9bf0',
    color: 'white',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    marginTop: '8px',
    transition: 'background 0.2s',
  },
  error: {
    background: '#3a1c1c',
    border: '1px solid #8b2e2e',
    borderRadius: '8px',
    padding: '12px',
    color: '#f4aaaa',
    fontSize: '14px',
  },
  footer: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #2f3336',
    textAlign: 'center',
  },
  footerText: {
    color: '#8b98a5',
    fontSize: '14px',
  },
};
