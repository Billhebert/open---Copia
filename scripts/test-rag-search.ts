#!/usr/bin/env tsx
/**
 * Script de teste completo para debug da pesquisa RAG
 * Testa todo o fluxo: Ollama → Embedding → Qdrant → Busca
 */

import 'dotenv/config';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Testa Ollama
async function testOllama() {
  console.log('\n📡 Testando Ollama...');
  console.log(`URL: ${OLLAMA_URL}`);

  try {
    // 1. Testa se está rodando
    const tagsResponse = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!tagsResponse.ok) {
      console.log('❌ Ollama não está respondendo');
      return false;
    }

    const tagsData = await tagsResponse.json();
    const models = tagsData.models || [];
    console.log('✅ Ollama está rodando');
    console.log(`   Modelos: ${models.map((m: any) => m.name).join(', ') || 'nenhum'}`);

    // 2. Verifica se o modelo de embedding está disponível
    const hasModel = models.some((m: any) => m.name.includes(EMBEDDING_MODEL));
    if (!hasModel) {
      console.log(`⚠️  Modelo ${EMBEDDING_MODEL} não encontrado!`);
      console.log(`   Execute: docker exec -it <container> ollama pull ${EMBEDDING_MODEL}`);
      return false;
    }

    // 3. Testa geração de embedding
    console.log(`\n🧪 Testando geração de embedding...`);
    const embedResponse = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: 'teste de embedding',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!embedResponse.ok) {
      const errorText = await embedResponse.text();
      console.log(`❌ Erro ao gerar embedding: ${embedResponse.status}`);
      console.log(`   Resposta: ${errorText}`);
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
    console.log(`   Primeiros 5 valores: [${embedding.slice(0, 5).map((v: number) => v.toFixed(3)).join(', ')}]`);

    return { success: true, embedding, dimensions: embedding.length };
  } catch (error: any) {
    console.log('❌ Erro ao conectar com Ollama');
    console.log(`   Erro: ${error.message}`);
    if (error.name === 'AbortError') {
      console.log('   Timeout! Verifique se o Ollama está rodando.');
    }
    return false;
  }
}

// Testa Qdrant
async function testQdrant() {
  console.log('\n📡 Testando Qdrant...');
  console.log(`URL: ${QDRANT_URL}`);

  try {
    // 1. Testa conexão
    const healthResponse = await fetch(`${QDRANT_URL}/`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!healthResponse.ok) {
      console.log('❌ Qdrant não está respondendo');
      return false;
    }

    console.log('✅ Qdrant está rodando');

    // 2. Lista coleções
    const collectionsResponse = await fetch(`${QDRANT_URL}/collections`);
    const collectionsData = await collectionsResponse.json();
    const collections = collectionsData.result?.collections || [];

    console.log(`   Coleções: ${collections.length}`);

    if (collections.length === 0) {
      console.log('⚠️  Nenhuma coleção encontrada');
      console.log('   Você precisa fazer upload de um documento primeiro!');
      return { success: true, collections: [] };
    }

    // 3. Verifica cada coleção
    for (const collection of collections) {
      console.log(`\n   📂 Coleção: ${collection.name}`);

      const infoResponse = await fetch(`${QDRANT_URL}/collections/${collection.name}`);
      const infoData = await infoResponse.json();

      const vectorsCount = infoData.result?.vectors_count || 0;
      const pointsCount = infoData.result?.points_count || 0;

      console.log(`      Vetores: ${vectorsCount}`);
      console.log(`      Pontos: ${pointsCount}`);

      if (pointsCount === 0) {
        console.log(`      ⚠️  Coleção vazia!`);
      }
    }

    return { success: true, collections };
  } catch (error: any) {
    console.log('❌ Erro ao conectar com Qdrant');
    console.log(`   Erro: ${error.message}`);
    return false;
  }
}

// Testa busca completa
async function testSearch(embedding: number[], collectionName?: string) {
  if (!collectionName) {
    console.log('\n⚠️  Pulando teste de busca (nenhuma coleção disponível)');
    return false;
  }

  console.log(`\n🔍 Testando busca na coleção: ${collectionName}`);

  try {
    const searchResponse = await fetch(`${QDRANT_URL}/collections/${collectionName}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: embedding,
        limit: 5,
        with_payload: true,
        score_threshold: 0.3, // Threshold mais baixo para teste
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.log(`❌ Erro ao buscar: ${searchResponse.status}`);
      console.log(`   Resposta: ${errorText}`);
      return false;
    }

    const searchData = await searchResponse.json();
    const results = searchData.result || [];

    console.log(`✅ Busca executada com sucesso`);
    console.log(`   Resultados encontrados: ${results.length}`);

    if (results.length > 0) {
      console.log('\n   📄 Resultados:');
      results.forEach((result: any, index: number) => {
        console.log(`      ${index + 1}. Score: ${result.score.toFixed(3)}`);
        console.log(`         Texto: ${(result.payload?.text || '').substring(0, 100)}...`);
      });
    } else {
      console.log('   ⚠️  Nenhum resultado encontrado');
      console.log('   Possíveis causas:');
      console.log('   - Score threshold muito alto (tente 0.1)');
      console.log('   - Embeddings diferentes (documento vs busca)');
      console.log('   - Filtros ACL bloqueando resultados');
    }

    return { success: true, results };
  } catch (error: any) {
    console.log('❌ Erro ao buscar');
    console.log(`   Erro: ${error.message}`);
    return false;
  }
}

// Main
async function main() {
  console.log('='.repeat(70));
  console.log('🔧 Diagnóstico Completo da Pesquisa RAG');
  console.log('='.repeat(70));

  // 1. Testa Ollama
  const ollamaResult = await testOllama();
  if (!ollamaResult || typeof ollamaResult === 'boolean') {
    console.log('\n❌ FALHA: Ollama não está funcionando corretamente');
    console.log('\n💡 Ações:');
    console.log('   1. Verifique se o Docker está rodando: docker ps');
    console.log('   2. Inicie o Ollama: docker-compose up -d ollama');
    console.log('   3. Baixe o modelo: docker exec -it <container> ollama pull nomic-embed-text');
    process.exit(1);
  }

  // 2. Testa Qdrant
  const qdrantResult = await testQdrant();
  if (!qdrantResult || typeof qdrantResult === 'boolean') {
    console.log('\n❌ FALHA: Qdrant não está funcionando corretamente');
    console.log('\n💡 Ações:');
    console.log('   1. Verifique se o Docker está rodando: docker ps');
    console.log('   2. Inicie o Qdrant: docker-compose up -d qdrant');
    process.exit(1);
  }

  // 3. Testa busca se houver coleções
  if (qdrantResult.collections && qdrantResult.collections.length > 0) {
    const firstCollection = qdrantResult.collections[0].name;
    await testSearch(ollamaResult.embedding, firstCollection);
  }

  // Resumo
  console.log('\n' + '='.repeat(70));
  console.log('📊 Resumo do Diagnóstico');
  console.log('='.repeat(70));
  console.log(`Ollama: ✅ OK (${ollamaResult.dimensions} dimensões)`);
  console.log(`Qdrant: ✅ OK (${qdrantResult.collections.length} coleções)`);

  if (qdrantResult.collections.length === 0) {
    console.log('\n⚠️  PRÓXIMO PASSO:');
    console.log('   Faça upload de um documento através da interface web');
    console.log('   Acesse: http://localhost:3000/rag');
  } else {
    console.log('\n✅ Sistema pronto para pesquisas!');
  }

  console.log('\n' + '='.repeat(70));
  process.exit(0);
}

main().catch(console.error);
