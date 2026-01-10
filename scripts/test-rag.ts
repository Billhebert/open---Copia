#!/usr/bin/env tsx
/**
 * Script de diagnóstico para testar o sistema RAG
 * Verifica: Ollama, Qdrant, Embeddings, e Busca
 */

import 'dotenv/config';

async function testOllama() {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  console.log('\n🔍 Testando Ollama...');
  console.log(`URL: ${ollamaUrl}`);

  try {
    // Testa se o serviço está rodando
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.log('❌ Ollama não está respondendo corretamente');
      console.log(`   Status: ${response.status}`);
      return false;
    }

    const data = await response.json();
    console.log('✅ Ollama está rodando');
    console.log(`   Modelos disponíveis: ${data.models?.map((m: any) => m.name).join(', ') || 'nenhum'}`);

    // Testa embedding
    const embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
    console.log(`\n🔍 Testando geração de embedding com modelo: ${embeddingModel}`);

    const embedResponse = await fetch(`${ollamaUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: embeddingModel,
        input: 'teste de embedding',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!embedResponse.ok) {
      const errorText = await embedResponse.text();
      console.log('❌ Erro ao gerar embedding');
      console.log(`   Status: ${embedResponse.status}`);
      console.log(`   Erro: ${errorText}`);
      return false;
    }

    const embedData = await embedResponse.json();
    const embedding = embedData.embedding || embedData.embeddings?.[0];

    if (!embedding) {
      console.log('❌ Resposta não contém embedding');
      console.log(`   Resposta: ${JSON.stringify(embedData)}`);
      return false;
    }

    console.log('✅ Embedding gerado com sucesso');
    console.log(`   Dimensões: ${embedding.length}`);
    return true;
  } catch (error: any) {
    console.log('❌ Erro ao conectar com Ollama');
    console.log(`   Erro: ${error.message}`);
    if (error.name === 'AbortError') {
      console.log('   Timeout ao conectar (>30s)');
    }
    return false;
  }
}

async function testQdrant() {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  console.log('\n🔍 Testando Qdrant...');
  console.log(`URL: ${qdrantUrl}`);

  try {
    const response = await fetch(`${qdrantUrl}/collections`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.log('❌ Qdrant não está respondendo corretamente');
      console.log(`   Status: ${response.status}`);
      return false;
    }

    const data = await response.json();
    console.log('✅ Qdrant está rodando');

    const collections = data.result?.collections || [];
    console.log(`   Coleções: ${collections.length}`);

    if (collections.length > 0) {
      for (const collection of collections) {
        console.log(`   - ${collection.name} (${collection.vectors_count || 0} vetores)`);
      }
    } else {
      console.log('   ⚠️  Nenhuma coleção encontrada. Faça upload de um documento primeiro.');
    }

    return true;
  } catch (error: any) {
    console.log('❌ Erro ao conectar com Qdrant');
    console.log(`   Erro: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 Diagnóstico do Sistema RAG');
  console.log('='.repeat(60));

  const ollamaOk = await testOllama();
  const qdrantOk = await testQdrant();

  console.log('\n' + '='.repeat(60));
  console.log('📊 Resumo');
  console.log('='.repeat(60));
  console.log(`Ollama: ${ollamaOk ? '✅ OK' : '❌ FALHA'}`);
  console.log(`Qdrant: ${qdrantOk ? '✅ OK' : '❌ FALHA'}`);

  if (!ollamaOk) {
    console.log('\n⚠️  AÇÃO NECESSÁRIA:');
    console.log('1. Verifique se o Docker está rodando: docker ps');
    console.log('2. Inicie o Ollama: docker-compose up -d ollama');
    console.log('3. Baixe o modelo: docker exec -it <container> ollama pull nomic-embed-text');
  }

  if (!qdrantOk) {
    console.log('\n⚠️  AÇÃO NECESSÁRIA:');
    console.log('1. Verifique se o Docker está rodando: docker ps');
    console.log('2. Inicie o Qdrant: docker-compose up -d qdrant');
  }

  console.log('\n' + '='.repeat(60));

  process.exit(ollamaOk && qdrantOk ? 0 : 1);
}

main().catch(console.error);
