import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../lib/api';
import { PlusCircle, MessageSquare, Clock } from 'lucide-react';

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const response = await chatApi.list();
      setChats(response.data.chats || []);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await chatApi.create({ title: newChatTitle });
      const newChat = response.data.chat;
      navigate(`/chat/${newChat.id}`);
    } catch (error) {
      console.error('Failed to create chat:', error);
      alert('Failed to create chat');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Your Chats</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          style={styles.createButton}
        >
          <PlusCircle size={20} />
          <span>New Chat</span>
        </button>
      </header>

      {loading ? (
        <div style={styles.loading}>Loading chats...</div>
      ) : chats.length === 0 ? (
        <div style={styles.empty}>
          <MessageSquare size={64} color="#3a3f47" />
          <h2 style={styles.emptyTitle}>No chats yet</h2>
          <p style={styles.emptyText}>Create your first chat to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={styles.emptyButton}
          >
            Create Chat
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
              style={styles.card}
            >
              <MessageSquare size={24} color="#1d9bf0" />
              <h3 style={styles.cardTitle}>{chat.title}</h3>
              <div style={styles.cardFooter}>
                <Clock size={14} />
                <span style={styles.cardDate}>
                  {new Date(chat.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div style={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Create New Chat</h2>
            <form onSubmit={handleCreateChat}>
              <input
                type="text"
                placeholder="Chat title"
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                style={styles.input}
                autoFocus
                required
              />
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
  },
  createButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: '#1d9bf0',
    color: 'white',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'background 0.2s',
  },
  loading: {
    textAlign: 'center',
    padding: '64px',
    color: '#8b98a5',
  },
  empty: {
    textAlign: 'center',
    padding: '64px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginTop: '16px',
  },
  emptyText: {
    color: '#8b98a5',
    fontSize: '16px',
  },
  emptyButton: {
    padding: '12px 32px',
    background: '#1d9bf0',
    color: 'white',
    borderRadius: '8px',
    fontWeight: '600',
    marginTop: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    background: '#16181c',
    border: '1px solid #2f3336',
    borderRadius: '12px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#8b98a5',
    fontSize: '13px',
    marginTop: 'auto',
  },
  cardDate: {
    fontSize: '13px',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: '#16181c',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '480px',
    width: '90%',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '24px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: '#0f1419',
    border: '1px solid #2f3336',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    marginBottom: '24px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '10px 24px',
    background: 'transparent',
    border: '1px solid #2f3336',
    borderRadius: '8px',
    color: '#e7e9ea',
  },
  submitButton: {
    padding: '10px 24px',
    background: '#1d9bf0',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '600',
  },
};
