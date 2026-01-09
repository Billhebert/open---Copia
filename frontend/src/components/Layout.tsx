import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MessageSquare, Database, LogOut, PlusCircle } from 'lucide-react';

export default function Layout() {
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <MessageSquare size={32} color="#1d9bf0" />
          <h1 style={styles.logoText}>AI Chat</h1>
        </div>

        <nav style={styles.nav}>
          <NavLink
            to="/"
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
            })}
          >
            <MessageSquare size={20} />
            <span>Chats</span>
          </NavLink>

          <NavLink
            to="/rag"
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
            })}
          >
            <Database size={20} />
            <span>RAG Documents</span>
          </NavLink>
        </nav>

        <button onClick={handleLogout} style={styles.logoutButton}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100vh',
  },
  sidebar: {
    width: '260px',
    background: '#16181c',
    borderRight: '1px solid #2f3336',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
    padding: '8px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '700',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    color: '#e7e9ea',
    transition: 'background 0.2s',
  },
  navLinkActive: {
    background: '#1d9bf020',
    color: '#1d9bf0',
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    color: '#f4aaaa',
    transition: 'background 0.2s',
    marginTop: 'auto',
  },
  main: {
    flex: 1,
    overflow: 'auto',
  },
};
