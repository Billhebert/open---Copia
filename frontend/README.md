# Frontend - Multi-Tenant AI Chat Platform

Modern React frontend for the AI Chat Platform.

## 🚀 Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **React Router** - Navigation
- **Zustand** - State management
- **Axios** - HTTP client
- **Lucide React** - Icons

## 📦 Installation

```bash
cd frontend
npm install
```

## 🛠️ Development

Start the dev server (with API proxy):

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` and will proxy API requests to `http://localhost:3000`.

## 🏗️ Build

Build for production:

```bash
npm run build
```

The built files will be in `../public-new/`.

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable components
│   │   └── Layout.tsx
│   ├── lib/           # Utilities
│   │   └── api.ts     # API client & methods
│   ├── pages/         # Page components
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ChatPage.tsx
│   │   └── RagPage.tsx
│   ├── store/         # Zustand stores
│   │   └── authStore.ts
│   ├── App.tsx        # Main app component
│   ├── main.tsx       # Entry point
│   └── index.css      # Global styles
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 🎨 Features

### Authentication
- API Key login
- JWT token management with refresh
- Auto-refresh on 401 errors
- Persistent authentication (localStorage)

### Chat Interface
- List all chats
- Create new chats
- Send messages
- RAG toggle for context-aware responses
- Real-time message display

### RAG Documents
- Search documents semantically
- Upload new documents (PDF, DOCX, TXT, MD)
- View search results with scores

## 🔧 Configuration

The API proxy is configured in `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

## 🎯 Usage

1. **Login**: Enter your API key (tenant or user key)
2. **Create Chat**: Click "New Chat" to create a conversation
3. **Send Messages**: Type and send messages, toggle RAG for document context
4. **Upload Documents**: Go to RAG tab to upload and search documents

## 🔐 Authentication Flow

1. User enters API key
2. Frontend calls `/api/auth/token`
3. Backend returns JWT access + refresh tokens
4. Tokens stored in localStorage (Zustand persist)
5. All API requests include `Authorization: Bearer <token>`
6. On 401, automatically refreshes token
7. On refresh failure, redirects to login

## 📝 API Integration

All API calls are in `src/lib/api.ts`:

```typescript
// Login
await authApi.login(apiKey);

// Create chat
await chatApi.create({ title: 'My Chat' });

// Send message
await chatApi.sendMessage(chatId, {
  content: 'Hello',
  useRag: true,
});

// Search RAG
await ragApi.search('company policy');

// Upload document
await ragApi.uploadDocument({
  name: 'Policy Doc',
  content: base64Content,
  format: 'pdf',
});
```

## 🎨 Styling

Inline CSS-in-JS for simplicity. Dark theme by default.

Color palette:
- Background: `#0f1419`
- Cards: `#16181c`
- Border: `#2f3336`
- Primary: `#1d9bf0` (Twitter blue)
- Text: `#e7e9ea`
- Muted: `#8b98a5`

## 🚀 Deployment

1. Build the frontend: `npm run build`
2. Serve `../public-new/` with your backend
3. Update backend to serve static files:

```typescript
app.use(express.static(path.join(__dirname, '../public-new')));
```

## 📦 Production Optimization

- Code splitting (React lazy + Suspense)
- Tree shaking (Vite)
- Minification
- Source maps for debugging

## 🔮 Future Enhancements

- [ ] WebSocket for real-time messages
- [ ] Message reactions & threads
- [ ] File attachments
- [ ] Rich text editor
- [ ] Dark/light theme toggle
- [ ] User settings panel
- [ ] Admin dashboard
- [ ] Multi-language support
