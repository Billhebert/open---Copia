#!/usr/bin/env tsx
/**
 * Script para testar os modelos do OpenCode SDK
 */

import 'dotenv/config';

const SDK_PORT = parseInt(process.env.SDK_PORT || '7501', 10);

async function testOpenCodeModels() {
  console.log('='.repeat(60));
  console.log('🧪 Testando Modelos do OpenCode SDK');
  console.log('='.repeat(60));
  console.log(`Porta: ${SDK_PORT}\n`);

  try {
    // Testar endpoint da SDK
    console.log('1. Verificando se SDK responde...');
    const health = await fetch(`http://127.0.0.1:${SDK_PORT}/health`, {
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    if (!health?.ok) {
      console.log('   ⚠️  /health não respondeu, tentando root...');
    }

    // Tentar criar sessão e fazer uma chamada
    console.log('\n2. Testando criação de sessão...');
    const sessionRes = await fetch(`http://127.0.0.1:${SDK_PORT}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Session' }),
      signal: AbortSignal.timeout(5000),
    });

    if (!sessionRes.ok) {
      const error = await sessionRes.text();
      console.log(`   ❌ Falha ao criar sessão: ${sessionRes.status} - ${error}`);
      console.log('\n💡 Verifique se a SDK está rodando corretamente');
      console.log('   A SDK precisa estar configurada com os modelos MiniMax/GPT-5');
      return;
    }

    const sessionData = await sessionRes.json();
    const sessionId = sessionData?.data?.id || sessionData?.id;
    console.log(`   ✅ Sessão criada: ${sessionId}`);

    if (sessionId) {
      console.log('\n3. Testando modelo MiniMax M2.1 Free...');
      const promptRes = await fetch(`http://127.0.0.1:${SDK_PORT}/api/sessions/${sessionId}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts: [{ type: 'text', text: 'Olá, como você está?' }],
          model: { providerID: 'opencode', modelID: 'minimax-m2.1-free' },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (promptRes.ok) {
        const promptData = await promptRes.json();
        const content = promptData?.data?.parts?.find((p: any) => p.type === 'text')?.text || JSON.stringify(promptData);
        console.log(`   ✅ MiniMax funcionou!`);
        console.log(`   Resposta: ${content.substring(0, 100)}...`);
      } else {
        const error = await promptRes.text();
        console.log(`   ❌ MiniMax falhou: ${promptRes.status}`);
        console.log(`   Erro: ${error.substring(0, 200)}`);
      }

      // Cleanup
      await fetch(`http://127.0.0.1:${SDK_PORT}/api/sessions/${sessionId}`, {
        method: 'DELETE',
      }).catch(() => {});
    }

  } catch (error: any) {
    console.log(`\n❌ Erro ao testar SDK: ${error.message}`);
    console.log('\n💡 Possíveis causas:');
    console.log('   - SDK não está rodando');
    console.log('   - Porta incorretamente configurada');
    console.log('   - Modelos não disponíveis na SDK');
  }

  console.log('\n' + '='.repeat(60));
}

testOpenCodeModels().catch(console.error);
