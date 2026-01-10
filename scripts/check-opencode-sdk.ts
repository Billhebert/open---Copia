#!/usr/bin/env tsx
/**
 * Script para verificar status do OpenCode SDK
 */

import 'dotenv/config';

const SDK_PORT = parseInt(process.env.SDK_PORT || '4096', 10);

async function checkOpenCodeSDK() {
  console.log('='.repeat(60));
  console.log('🔍 Verificando OpenCode SDK');
  console.log('='.repeat(60));
  console.log(`Porta configurada: ${SDK_PORT}\n`);

  // Tenta conectar no SDK
  try {
    console.log(`Tentando conectar em http://127.0.0.1:${SDK_PORT}...`);

    const response = await fetch(`http://127.0.0.1:${SDK_PORT}/`, {
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      console.log('✅ OpenCode SDK está respondendo!');
      console.log(`   Status: ${response.status}`);

      try {
        const text = await response.text();
        console.log(`   Resposta: ${text.substring(0, 100)}...`);
      } catch (e) {
        console.log('   (sem corpo de resposta)');
      }
    } else {
      console.log(`⚠️  SDK respondeu com erro: ${response.status}`);
    }

  } catch (error: any) {
    console.log('❌ Não foi possível conectar ao OpenCode SDK');
    console.log(`   Erro: ${error.message}`);

    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.log('   Causa: Timeout (>5s)');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   Causa: Conexão recusada - SDK não está rodando');
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 O OpenCode SDK NÃO é obrigatório!');
    console.log('='.repeat(60));
    console.log('\nO sistema possui fallback automático:');
    console.log('1. Tenta MiniMax M2.1 Free (requer SDK)');
    console.log('2. Tenta GPT-5 Nano (requer SDK)');
    console.log('3. Usa Ollama local (SEMPRE disponível) ✅');
    console.log('\nSe você não tem o OpenCode SDK rodando, o sistema');
    console.log('vai automaticamente usar Ollama como fallback.');

    console.log('\n' + '='.repeat(60));
    console.log('📝 Para usar o OpenCode SDK (opcional):');
    console.log('='.repeat(60));
    console.log('1. Instale: npm install -g @opencode-ai/sdk');
    console.log('2. Configure a porta no .env: SDK_PORT=4096');
    console.log('3. O SDK será iniciado automaticamente pelo backend');

    console.log('\n' + '='.repeat(60));
    console.log('✅ Recomendação: Use apenas Ollama');
    console.log('='.repeat(60));
    console.log('Para melhor desempenho e privacidade, recomendamos');
    console.log('usar apenas Ollama local. Ele já funciona como fallback!');
    console.log('\nPara verificar Ollama: npm run check:ollama');

    console.log('\n' + '='.repeat(60));
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Status');
  console.log('='.repeat(60));
  console.log('OpenCode SDK: ✅ RODANDO');
  console.log('\nModelos disponíveis via SDK:');
  console.log('- MiniMax M2.1 Free (gratuito)');
  console.log('- GPT-5 Nano');
  console.log('\nFallback local:');
  console.log('- Ollama (sempre disponível)');
  console.log('\n' + '='.repeat(60));
}

checkOpenCodeSDK().catch(console.error);
