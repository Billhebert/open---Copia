class OpenCodeChat {
  constructor() {
    this.currentSessionId = null;
    this.sessions = [];
    this.models = [];
    this.isLoading = false;
    this.attachments = [];
    this.currentFilter = "all";
    this.initElements();
    this.initEvents();
    this.loadModels();
    this.loadSessions();
  }

  initElements() {
    this.sessionsList = document.getElementById("sessionsList");
    this.chatMessages = document.getElementById("chatMessages");
    this.messageInput = document.getElementById("messageInput");
    this.sendBtn = document.getElementById("sendBtn");
    this.newChatBtn = document.getElementById("newChatBtn");
    this.currentSessionTitle = document.getElementById("currentSessionTitle");
    this.modelSelect = document.getElementById("modelSelect");
    this.modelBadge = document.getElementById("modelBadge");
    this.modelInfo = document.getElementById("modelInfo");
    this.fileInput = document.getElementById("fileInput");
    this.attachmentsPreview = document.getElementById("attachmentsPreview");
    this.fileCount = document.getElementById("fileCount");
    this.modelCount = document.getElementById("modelCount");
  }

  initEvents() {
    this.newChatBtn.addEventListener("click", () => this.createSession());
    this.sendBtn.addEventListener("click", () => this.sendMessage());
    this.messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.fileInput.addEventListener("change", (e) => this.handleFiles(e.target.files));
    this.modelSelect.addEventListener("change", () => this.updateModelInfo());
    
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.currentFilter = e.target.dataset.filter;
        this.renderModelSelect();
      });
    });
  }

  async loadModels() {
    try {
      const res = await fetch("/api/models");
      
      if (!res.ok) throw new Error("Falha ao carregar modelos");
      
      const data = await res.json();
      this.models = data.models || [];
      this.modelCount.textContent = `${this.models.length} modelos`;
      this.renderModelSelect();
      this.updateModelInfo();
    } catch (error) {
      console.error("Erro ao carregar modelos:", error);
      this.modelSelect.innerHTML = '<option value="opencode/big-pickle">Big Pickle (fallback)</option>';
    }
  }

  renderModelSelect() {
    let filteredModels = this.models;
    
    if (this.currentFilter === "free") {
      filteredModels = this.models.filter((m) => m.cost.type === "free");
    } else if (this.currentFilter === "multimodal") {
      filteredModels = this.models.filter(
        (m) =>
          m.modalities.input.includes("image") ||
          m.modalities.input.includes("video") ||
          m.modalities.input.includes("audio")
      );
    }

    const currentValue = this.modelSelect.value;
    
    this.modelSelect.innerHTML = filteredModels
      .map((model) => {
        const costLabel = model.cost.type === "free" ? "⭐" : "💰";
        const capabilities = [];
        if (model.capabilities.reasoning) capabilities.push("🧠");
        if (model.capabilities.toolCall) capabilities.push("🔧");
        if (model.capabilities.attachments) capabilities.push("📎");
        
        const modalities = [];
        if (model.modalities.input.includes("text")) modalities.push("📝");
        if (model.modalities.input.includes("image")) modalities.push("🖼️");
        if (model.modalities.input.includes("audio")) modalities.push("🎵");
        if (model.modalities.input.includes("video")) modalities.push("🎬");
        
        return `<option value="${model.id}" data-capabilities='${JSON.stringify(model.capabilities)}' data-modalities='${JSON.stringify(model.modalities)}' data-cost='${JSON.stringify(model.cost)}'>
          ${costLabel} ${model.name} (${model.providerName})
        </option>`;
      })
      .join("");

    if (currentValue && this.modelSelect.querySelector(`option[value="${currentValue}"]`)) {
      this.modelSelect.value = currentValue;
    } else if (filteredModels.length > 0) {
      const freeModel = filteredModels.find((m) => m.cost.type === "free");
      this.modelSelect.value = freeModel?.id || filteredModels[0].id;
    }
    
    this.updateModelInfo();
  }

  updateModelInfo() {
    const selectedOption = this.modelSelect.selectedOptions[0];
    if (!selectedOption) return;
    
    try {
      const capsStr = selectedOption.dataset.capabilities;
      const modStr = selectedOption.dataset.modalities;
      const costStr = selectedOption.dataset.cost;
      
      const capabilities = capsStr ? JSON.parse(capsStr) : { reasoning: false, toolCall: false, attachments: false };
      const modalities = modStr ? JSON.parse(modStr) : { input: ["text"], output: ["text"] };
      const cost = costStr ? JSON.parse(costStr) : { type: "free" };
      
      const capabilityIcons = [];
      if (capabilities.reasoning) capabilityIcons.push("🧠 Raciocínio");
      if (capabilities.toolCall) capabilityIcons.push("🔧 Ferramentas");
      if (capabilities.attachments) capabilityIcons.push("📎 Anexos");
      
      const modalityIcons = [];
      if (modalities.input.includes("text")) modalityIcons.push("📝 Texto");
      if (modalities.input.includes("image")) modalityIcons.push("🖼️ Imagem");
      if (modalities.input.includes("audio")) modalityIcons.push("🎵 Áudio");
      if (modalities.input.includes("video")) modalityIcons.push("🎬 Vídeo");
      
      let costText = cost.type === "free" ? "Gratuito" : `💰 $${cost.input}/1M input • $${cost.output}/1M output`;
      
      this.modelInfo.innerHTML = `
        <small>
          <div>${costText}</div>
          <div>Input: ${modalityIcons.join(" ")}</div>
          ${capabilityIcons.length > 0 ? `<div>Capacidades: ${capabilityIcons.join(" ")}</div>` : ""}
        </small>
      `;
     } catch (e) {
      this.modelInfo.innerHTML = "<small>Informações do modelo</small>";
    }
  }

  getMediaType(file) {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "file";
  }

  async handleFiles(files) {
    if (!files || files.length === 0) return;

    for (const file of files) {
      const mediaType = this.getMediaType(file);
      
      try {
        const base64 = await this.fileToBase64(file);
        
        this.attachments.push({
          file,
          name: file.name,
          type: mediaType,
          mimeType: file.type,
          data: base64,
        });
      } catch (error) {
        console.error("Erro ao ler arquivo:", error);
        alert(`Erro ao procesar ${file.name}`);
      }
    }

    this.renderAttachments();
    this.fileInput.value = "";
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  renderAttachments() {
    if (this.attachments.length === 0) {
      this.attachmentsPreview.innerHTML = "";
      this.fileCount.textContent = "0 arquivos anexados";
      return;
    }

    this.fileCount.textContent = `${this.attachments.length} arquivo(s) anexado(s)`;

    this.attachmentsPreview.innerHTML = this.attachments
      .map((att, index) => {
        let preview = "";
        if (att.type === "image") {
          preview = `<img src="${att.data}" alt="${att.name}">`;
        } else if (att.type === "video") {
          preview = `<video src="${att.data}"></video>`;
        } else if (att.type === "audio") {
          preview = `<audio controls src="${att.data}"></audio>`;
        } else {
          preview = `<div class="file-icon">📄</div>`;
        }

        return `
      <div class="attachment-item">
        ${preview}
        <span class="attachment-name" title="${att.name}">${att.name}</span>
        <button class="remove-attachment" onclick="chat.removeAttachment(${index})">×</button>
      </div>
    `;
      })
      .join("");
  }

  removeAttachment(index) {
    this.attachments.splice(index, 1);
    this.renderAttachments();
  }

  clearAttachments() {
    this.attachments = [];
    this.renderAttachments();
  }

  async createSession() {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Novo Chat",
          model: this.modelSelect.value,
        }),
      });

      if (!res.ok) throw new Error("Falha ao criar sessão");

      const session = await res.json();
      this.sessions.unshift(session);
      this.renderSessions();
      this.selectSession(session.id);
    } catch (error) {
      console.error("Erro ao criar sessão:", error);
      this.showError("Erro ao criar sessão");
    }
  }

  async loadSessions() {
    try {
      this.isLoading = true;
      const res = await fetch("/api/sessions");

      if (!res.ok) throw new Error("Falha ao carregar sessões");

      this.sessions = await res.json();
      this.renderSessions();

      if (this.sessions.length > 0) {
        this.selectSession(this.sessions[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar sessões:", error);
      this.showError("Erro ao carregar sessões");
    } finally {
      this.isLoading = false;
    }
  }

  async selectSession(id) {
    this.currentSessionId = id;
    this.clearAttachments();
    const session = this.sessions.find((s) => s.id === id);

    if (!session) return;

    this.currentSessionTitle.textContent = session.title;
    this.modelBadge.textContent = session.model?.split("/")[1] || "AI";

    this.chatMessages.innerHTML = `
      <div class="welcome-message">
        <h2>${session.title} 📝</h2>
        <p>Carregando mensagens...</p>
      </div>
    `;

    try {
      const res = await fetch(`/api/sessions/${id}`);

      if (!res.ok) throw new Error("Falha ao carregar sessão");

      const data = await res.json();
      this.renderMessages(data.messages || []);
    } catch (error) {
      console.error("Erro ao carregar sessão:", error);
      this.showError("Erro ao carregar sessão");
    }
  }

  async deleteSession(id) {
    const session = this.sessions.find((s) => s.id === id);
    if (!session) return;

    const confirmDelete = confirm(`Tem certeza que deseja excluir "${session.title}"?\n\nEsta ação não pode ser desfeita.`);

    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Falha ao excluir sessão");

      this.sessions = this.sessions.filter((s) => s.id !== id);

      if (this.currentSessionId === id) {
        this.chatMessages.innerHTML = `
          <div class="welcome-message">
            <h2>Chat Excluído 🗑️</h2>
            <p>O chat foi removido com sucesso.</p>
          </div>
        `;
        this.currentSessionId = null;
        this.currentSessionTitle.textContent = "Novo Chat";

        if (this.sessions.length > 0) {
          this.selectSession(this.sessions[0].id);
        }
      }

      this.renderSessions();
    } catch (error) {
      console.error("Erro ao excluir sessão:", error);
      alert("Erro ao excluir sessão: " + error.message);
    }
  }

  async sendMessage() {
    const message = this.messageInput.value.trim();
    
    if (!message && this.attachments.length === 0) {
      if (!this.currentSessionId) {
        alert("Selecione ou crie um chat primeiro!");
      }
      return;
    }

    if (!this.currentSessionId) {
      await this.createSession();
      if (!this.currentSessionId) return;
    }

    const userMessage = {
      role: "user",
      content: message,
      timestamp: Date.now(),
      attachments: this.attachments.map(a => ({ name: a.name, type: a.type })),
    };

    this.appendMessage(userMessage);
    this.messageInput.value = "";
    this.messageInput.style.height = "auto";

    try {
      const parts = [];

      if (message) {
        parts.push({ type: "text", text: message });
      }

      for (const att of this.attachments) {
        if (att.type === "image") {
          parts.push({ type: "image", data: att.data });
        } else if (att.type === "video") {
          parts.push({ type: "video", data: att.data });
        } else if (att.type === "audio") {
          parts.push({ type: "audio", data: att.data });
        } else {
          parts.push({ type: "file", data: att.data, name: att.name });
        }
      }

      const res = await fetch(`/api/sessions/${this.currentSessionId}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parts,
          model: this.modelSelect.value,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Falha ao enviar mensagem");
      }

      const data = await res.json();

      const assistantMessage = {
        role: "assistant",
        content: data.response,
        timestamp: Date.now(),
      };

      this.appendMessage(assistantMessage);
      this.clearAttachments();
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      this.appendMessage({
        role: "assistant",
        content: `Erro: ${error.message}`,
        timestamp: Date.now(),
      });
    }
  }

  appendMessage(message) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${message.role}`;

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    
    let html = "";
    if (message.content) {
      html += `<p>${this.escapeHtml(message.content).replace(/\n/g, "<br>")}</p>`;
    }

    if (message.attachments && message.attachments.length > 0) {
      html += `<div class="message-attachments">`;
      for (const att of message.attachments) {
        html += `<span class="attachment-badge">📎 ${att.name}</span>`;
      }
      html += `</div>`;
    }

    contentDiv.innerHTML = html;

    const timeDiv = document.createElement("div");
    timeDiv.className = "message-time";
    timeDiv.textContent = new Date(message.timestamp).toLocaleTimeString();

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);

    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  renderMessages(messages) {
    this.chatMessages.innerHTML = "";

    if (messages.length === 0) {
      this.chatMessages.innerHTML = `
        <div class="welcome-message">
          <h2>Bem-vindo! 👋</h2>
          <p>Esta sessão ainda não tem mensagens.</p>
          <p>Comece digitando ou anexe um arquivo!</p>
        </div>
      `;
      return;
    }

    messages.forEach((msg) => this.appendMessage(msg));
  }

  renderSessions() {
    if (this.sessions.length === 0) {
      this.sessionsList.innerHTML = `
        <div class="empty-sessions">
          <p>Nenhuma sessão ainda</p>
          <p>Clique em "+ Novo Chat" para começar</p>
        </div>
      `;
      return;
    }

    this.sessionsList.innerHTML = this.sessions
      .map((session) => {
        const isActive = session.id === this.currentSessionId;
        const modelName = session.model?.split("/")[1] || "AI";

        return `
      <div class="session-item ${isActive ? "active" : ""}" data-id="${session.id}">
        <div class="session-info" onclick="chat.selectSession('${session.id}')">
          <div class="session-title">${this.escapeHtml(session.title)}</div>
          <div class="session-model">${modelName}</div>
        </div>
        <div class="session-actions">
          <button class="btn-delete-session" onclick="event.stopPropagation(); chat.deleteSession('${session.id}')" title="Excluir chat">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
        <div class="session-time">${new Date(session.updatedAt).toLocaleDateString()}</div>
      </div>
    `;
      })
      .join("");
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    this.chatMessages.innerHTML = `
      <div class="error-message">
        <h2>Erro 😕</h2>
        <p>${message}</p>
      </div>
    `;
  }
}

let chat;
document.addEventListener("DOMContentLoaded", () => {
  chat = new OpenCodeChat();
});
