import { createOpencode } from "@opencode-ai/sdk";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT) || 7500;
const SDK_PORT = parseInt(process.env.SDK_PORT) || PORT + 1;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let opencode = null;
let client = null;
let modelsData = null;

async function loadModels() {
  try {
    const data = await fs.readFile(path.join(__dirname, "models.json"), "utf-8");
    modelsData = JSON.parse(data);
    console.log(`📦 Carregados ${Object.keys(modelsData).length} providers de modelos`);
    return modelsData;
  } catch (error) {
    console.warn(`⚠️ Não foi possível carregar models.json: ${error.message}`);
    return null;
  }
}

async function initSDK() {
  console.log(`🔄 Carregando modelos...`);
  await loadModels();
  
  console.log(`🔄 Iniciando OpenCode SDK...`);
  
  try {
    const result = await createOpencode({
      hostname: "127.0.0.1",
      port: SDK_PORT,
      timeout: 60000,
      config: {
        model: "opencode/minimax-m2.1-free",
      },
    });
    
    client = result.client;
    opencode = result;
    console.log(`✅ OpenCode SDK rodando em ${opencode.server.url}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    return false;
  }
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({
    running: true,
    url: opencode?.server?.url,
    timestamp: Date.now(),
  });
});

app.get("/api/models", (req, res) => {
  if (!modelsData) {
    return res.status(503).json({ error: "Models data not loaded" });
  }

  const { free, paid, provider, modality } = req.query;
  const result = [];

  for (const [providerId, providerData] of Object.entries(modelsData)) {
    const models = providerData.models || {};
    
    for (const [modelId, model] of Object.entries(models)) {
      const modalities = model.modalities || { input: ["text"], output: ["text"] };
      const isFree = modelId.toLowerCase().includes("free");
      const hasReasoning = model.reasoning === true;
      const hasTools = model.tool_call === true;

      let include = true;
      if (free === "true" && !isFree) include = false;
      if (paid === "true" && isFree) include = false;
      if (provider && providerId !== provider) include = false;
      if (modality) {
        const modLower = modality.toLowerCase();
        const hasModality = modalities.input?.includes(modLower) || modalities.output?.includes(modLower);
        if (!hasModality) include = false;
      }

      if (include) {
        result.push({
          id: `${providerId}/${modelId}`,
          providerId,
          providerName: providerData.name || providerId,
          modelId,
          name: model.name || modelId,
          modalities: {
            input: modalities.input || ["text"],
            output: modalities.output || ["text"],
          },
          capabilities: {
            reasoning: hasReasoning,
            toolCall: hasTools,
            attachments: model.attachment || false,
          },
          cost: isFree ? { type: "free" } : {
            type: "paid",
            input: model.cost?.input || 0,
            output: model.cost?.output || 0,
            currency: "USD",
          },
          limits: {
            context: model.limit?.context || 32768,
            output: model.limit?.output || 4096,
          },
          knowledge: model.knowledge || "Unknown",
        });
      }
    }
  }

  res.json({
    total: result.length,
    models: result.sort((a, b) => a.name.localeCompare(b.name)),
  });
});

app.get("/api/providers", async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.config.providers();
    res.json(result.data || { providers: [], default: {} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/projects", async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.project.list();
    res.json(result.data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/providers", (req, res) => {
  if (!modelsData) {
    return res.status(503).json({ error: "Models data not loaded" });
  }

  const providers = [];
  for (const [providerId, providerData] of Object.entries(modelsData)) {
    providers.push({
      id: providerId,
      name: providerData.name || providerId,
      env: providerData.env || [],
      api: providerData.api || null,
      doc: providerData.doc || null,
    });
  }

  res.json({
    total: providers.length,
    providers: providers.sort((a, b) => a.name.localeCompare(b.name)),
  });
});

app.get("/api/path", async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.path.get();
    res.json(result.data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/agents", async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.app.agents();
    res.json(result.data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/sessions", async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.session.list();
    const sessions = (result.data || []).map(s => ({
      id: s.id,
      title: s.title,
      projectID: s.projectID,
      directory: s.directory,
      createdAt: s.time?.created || Date.now(),
      updatedAt: s.time?.updated || Date.now(),
      summary: s.summary,
    }));
    res.json(sessions.sort((a, b) => b.updatedAt - a.updatedAt));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sessions", async (req, res) => {
  const { title, systemPrompt, model, agent } = req.body;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const body = { title: title || "Novo Chat" };
    
    if (model) {
      const [providerID, modelID] = model.split("/");
      body.model = { providerID, modelID };
    }
    
    const result = await client.session.create({ body });
    const sessionId = result.id || result.data?.id;
    
    if (systemPrompt) {
      await client.session.prompt({
        path: { id: sessionId },
        body: {
          noReply: true,
          parts: [{ type: "text", text: systemPrompt }],
        },
      });
    }
    
    res.json({
      id: sessionId,
      title: title || "Novo Chat",
      systemPrompt,
      model: model || "opencode/big-pickle",
      agent: agent || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/sessions/:id", async (req, res) => {
  const { id } = req.params;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const [sessionResult, messagesResult, childrenResult] = await Promise.all([
      client.session.get({ path: { id } }),
      client.session.messages({ path: { id } }),
      client.session.children({ path: { id } }).catch(() => ({ data: [] })),
    ]);
    
    const session = sessionResult.data || sessionResult;
    const messages = (messagesResult.data || []).map(m => ({
      id: m.info?.id,
      role: m.info?.role,
      content: m.parts?.find(p => p.type === "text")?.text || "",
      type: m.parts?.find(p => p.type === "reasoning") ? "reasoning" : "text",
      reasoning: m.parts?.find(p => p.type === "reasoning")?.text || null,
      createdAt: m.info?.time?.created || Date.now(),
    }));
    
    const children = (childrenResult.data || []).map(c => ({
      id: c.id,
      title: c.title,
      createdAt: c.time?.created || Date.now(),
    }));
    
    res.json({
      id: session.id,
      title: session.title,
      messages,
      children,
      createdAt: session.time?.created || Date.now(),
      updatedAt: session.time?.updated || Date.now(),
      summary: session.summary,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/sessions/:id", async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.session.update({
      path: { id },
      body: { title },
    });
    res.json(result.data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/sessions/:id", async (req, res) => {
  const { id } = req.params;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    await client.session.delete({ path: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sessions/:id/prompt", async (req, res) => {
  const { id } = req.params;
  const { message, noReply, model, agent, variant, parts } = req.body;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  if (!message && (!parts || parts.length === 0)) {
    return res.status(400).json({ error: "Message ou parts é obrigatório" });
  }
  
  try {
    const body = {
      parts: parts || (message ? [{ type: "text", text: message }] : []),
    };
    
    if (noReply) body.noReply = true;
    if (model) {
      const [providerID, modelID] = model.split("/");
      body.model = { providerID, modelID };
    }
    if (agent) body.agent = agent;
    if (variant) body.variant = variant;
    
    const result = await client.session.prompt({
      path: { id },
      body,
    });
    
    const data = result.data || result;
    const textPart = data.parts?.find(p => p.type === "text");
    const reasoningPart = data.parts?.find(p => p.type === "reasoning");
    
    res.json({
      messageId: data.info?.id,
      response: textPart?.text || "",
      reasoning: reasoningPart?.text || null,
      role: data.info?.role,
      model: data.info?.modelID,
      provider: data.info?.providerID,
      agent: data.info?.agent,
      mode: data.info?.mode,
      tokens: data.info?.tokens,
      cost: data.info?.cost,
      finished: data.info?.finish,
      path: data.info?.path,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sessions/:id/prompt-async", async (req, res) => {
  const { id } = req.params;
  const { message, model } = req.body;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  if (!message) {
    return res.status(400).json({ error: "Message é obrigatório" });
  }
  
  try {
    const body = {
      parts: [{ type: "text", text: message }],
    };
    
    if (model) {
      const [providerID, modelID] = model.split("/");
      body.model = { providerID, modelID };
    }
    
    const result = await client.session.promptAsync({
      path: { id },
      body,
    });
    
    res.json({
      taskId: result.data?.taskID,
      message: "Prompt enviado assincronamente",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sessions/:id/command", async (req, res) => {
  const { id } = req.params;
  const { command } = req.body;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  if (!command) {
    return res.status(400).json({ error: "Command é obrigatório" });
  }
  
  try {
    const result = await client.session.command({
      path: { id },
      body: { command },
    });
    
    const data = result.data || result;
    const textPart = data.parts?.find(p => p.type === "text");
    
    res.json({
      output: textPart?.text || "",
      role: data.info?.role,
      tokens: data.info?.tokens,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sessions/:id/shell", async (req, res) => {
  const { id } = req.params;
  const { command } = req.body;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  if (!command) {
    return res.status(400).json({ error: "Command é obrigatório" });
  }
  
  try {
    const result = await client.session.shell({
      path: { id },
      body: { command },
    });
    
    const data = result.data || result;
    const textPart = data.parts?.find(p => p.type === "text");
    
    res.json({
      output: textPart?.text || "",
      role: data.info?.role,
      tokens: data.info?.tokens,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sessions/:id/abort", async (req, res) => {
  const { id } = req.params;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.session.abort({ path: { id } });
    res.json({ success: result.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sessions/:id/share", async (req, res) => {
  const { id } = req.params;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.session.share({ path: { id } });
    res.json({
      shareUrl: result.data?.shareURL,
      expiresAt: result.data?.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/sessions/:id/share", async (req, res) => {
  const { id } = req.params;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.session.unshare({ path: { id } });
    res.json({ success: result.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sessions/:id/summarize", async (req, res) => {
  const { id } = req.params;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.session.summarize({
      path: { id },
      body: {},
    });
    res.json({ success: result.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sessions/:id/init", async (req, res) => {
  const { id } = req.params;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.session.init({
      path: { id },
      body: {},
    });
    res.json({ success: result.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sessions/:id/fork", async (req, res) => {
  const { id } = req.params;
  const { messageId } = req.body;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.session.fork({
      path: { id },
      body: { messageID: messageId },
    });
    res.json({
      newSessionId: result.data?.id,
      title: result.data?.title,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sessions/:id/revert", async (req, res) => {
  const { id } = req.params;
  const { messageId } = req.body;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  if (!messageId) {
    return res.status(400).json({ error: "Message ID é obrigatório" });
  }
  
  try {
    const result = await client.session.revert({
      path: { id },
      body: { messageID: messageId },
    });
    res.json(result.data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sessions/:id/unrevert", async (req, res) => {
  const { id } = req.params;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.session.unrevert({ path: { id } });
    res.json(result.data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/sessions/:id/diff", async (req, res) => {
  const { id } = req.params;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.session.diff({ path: { id } });
    res.json(result.data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/sessions/:id/todo", async (req, res) => {
  const { id } = req.params;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.session.todo({ path: { id } });
    res.json(result.data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sessions/:id/todo", async (req, res) => {
  const { id } = req.params;
  const { action, content, index } = req.body;
  
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.todo.write({
      body: {
        sessionID: id,
        action,
        content,
        index,
      },
    });
    res.json({ success: result.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/files/search", async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  const { pattern, type, directory, limit } = req.query;
  
  try {
    if (pattern) {
      const results = await client.find.text({ query: { pattern } });
      res.json(results.data || []);
    } else {
      const files = await client.find.files({
        query: {
          query: "*",
          type: type || "file",
          directory: directory || undefined,
          limit: limit ? parseInt(limit) : undefined,
        },
      });
      res.json(files.data || []);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/files/read", async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  const { path: filePath } = req.query;
  
  if (!filePath) {
    return res.status(400).json({ error: "Path é obrigatório" });
  }
  
  try {
    const result = await client.file.read({ query: { path: filePath } });
    res.json(result.data || { type: "raw", content: "" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/files/status", async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  try {
    const result = await client.file.status({ query: {} });
    res.json(result.data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/symbols", async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  const { query } = req.query;
  
  try {
    const results = await client.find.symbols({ query: { query: query || "" } });
    res.json(results.data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/log", async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  const { service, level, message } = req.body;
  
  try {
    const result = await client.app.log({ body: { service, level, message } });
    res.json({ success: result.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/events", async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: "SDK não inicializado" });
  }
  
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  try {
    const events = await client.event.subscribe();
    
    for await (const event of events.stream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`);
  }
  
  req.on("close", () => {
    res.end();
  });
});

async function start() {
  const connected = await initSDK();
  
  app.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════════════╗`);
    console.log(`║       OpenCode SDK Chat 100%                   ║`);
    console.log(`╚════════════════════════════════════════════════╝`);
    console.log(`\n🌐 Dashboard: http://localhost:${PORT}`);
    console.log(`🔌 SDK Server: ${opencode?.server?.url || "Não iniciado"}`);
    console.log(`📊 Status: ${connected ? "✅ Conectado" : "❌ Falha"}`);
    console.log(`\nSDK Session APIs:`);
    console.log(`  session.list()           Listar sessões`);
    console.log(`  session.create()         Criar sessão`);
    console.log(`  session.get()            Obter sessão`);
    console.log(`  session.update()         Atualizar sessão`);
    console.log(`  session.delete()         Deletar sessão`);
    console.log(`  session.messages()       Listar mensagens`);
    console.log(`  session.message()        Obter mensagem`);
    console.log(`  session.prompt()         Enviar prompt`);
    console.log(`  session.promptAsync()    Prompt assíncrono`);
    console.log(`  session.command()        Executar comando`);
    console.log(`  session.shell()          Executar shell`);
    console.log(`  session.abort()          Abortar sessão`);
    console.log(`  session.share()          Compartilhar`);
    console.log(`  session.unshare()        Descompartilhar`);
    console.log(`  session.summarize()      Resumir sessão`);
    console.log(`  session.init()           Analisar app`);
    console.log(`  session.fork()           Bifurcar sessão`);
    console.log(`  session.revert()         Reverter mensagem`);
    console.log(`  session.unrevert()       Restaurar`);
    console.log(`  session.diff()           Ver diff`);
    console.log(`  session.todo()           Ver tarefas`);
    console.log(`  session.children()       Listar filhos`);
    console.log(`\n`);
  });
}

process.on("SIGINT", async () => {
  console.log("\n🛑 Encerrando...");
  if (opencode?.server) {
    opencode.server.close();
  }
  process.exit(0);
});

start();
