import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { chatApi } from '../lib/api';
import { Send, Database, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [useRag, setUseRag] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatId) {
      loadMessages();
    }
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await chatApi.get(chatId!);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = {
      id: 'temp-' + Date.now(),
      role: 'user' as const,
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await chatApi.sendMessage(chatId!, {
        content: input,
        useRag,
      });

      // Remove temporary message and add real messages
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== userMessage.id),
        response.data.userMessage,
        ...(response.data.assistantMessage
          ? [response.data.assistantMessage]
          : []),
      ]);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.messagesContainer}>
        {loading ? (
          <div style={styles.loading}>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div style={styles.empty}>
            <Bot size={64} color="#3a3f47" />
            <h2 style={styles.emptyTitle}>Start a conversation</h2>
            <p style={styles.emptyText}>Send a message to get started</p>
          </div>
        ) : (
          <div style={styles.messages}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  ...styles.message,
                  ...(message.role === 'user'
                    ? styles.userMessage
                    : styles.assistantMessage),
                }}
              >
                <div style={styles.messageIcon}>
                  {message.role === 'user' ? (
                    <User size={20} />
                  ) : (
                    <Bot size={20} />
                  )}
                </div>
                <div style={styles.messageContent}>
                  <div style={styles.messageHeader}>
                    <span style={styles.messageRole}>
                      {message.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                    <span style={styles.messageTime}>
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={styles.messageText}>{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSend} style={styles.inputContainer}>
        <label style={styles.ragToggle}>
          <input
            type="checkbox"
            checked={useRag}
            onChange={(e) => setUseRag(e.target.checked)}
            style={styles.checkbox}
          />
          <Database size={16} />
          <span>Use RAG</span>
        </label>

        <div style={styles.inputWrapper}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            style={styles.input}
            disabled={sending}
          />
          <button
            type="submit"
            style={styles.sendButton}
            disabled={sending || !input.trim()}
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  messagesContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
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
  messages: {
    maxWidth: '900px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  message: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    borderRadius: '12px',
  },
  userMessage: {
    background: '#1d9bf020',
  },
  assistantMessage: {
    background: '#16181c',
  },
  messageIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#2f3336',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  messageRole: {
    fontWeight: '600',
    fontSize: '14px',
  },
  messageTime: {
    color: '#8b98a5',
    fontSize: '13px',
  },
  messageText: {
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
  },
  inputContainer: {
    borderTop: '1px solid #2f3336',
    padding: '20px',
    background: '#16181c',
  },
  ragToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#8b98a5',
  },
  checkbox: {
    width: '16px',
    height: '16px',
  },
  inputWrapper: {
    display: 'flex',
    gap: '12px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  input: {
    flex: 1,
    padding: '14px 20px',
    background: '#0f1419',
    border: '1px solid #2f3336',
    borderRadius: '24px',
    fontSize: '15px',
    outline: 'none',
  },
  sendButton: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#1d9bf0',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },
};
