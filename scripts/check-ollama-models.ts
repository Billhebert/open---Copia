#!/usr/bin/env tsx
/**
 * Script para verificar modelos Ollama instalados
 */

import 'dotenv/config';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

async function checkOllamaModels() {
  console.log('='.repeat(60));
  console.log('🔍 Verificando Modelos Ollama Instalados');
  console.log('='.repeat(60));
  console.log(`URL: ${OLLAMA_URL}\n`);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.log('❌ Ollama não está respondendo');
      console.log(`   Status: ${response.status}`);
      process.exit(1);
    }

    const data = await response.json();
    const models = data.models || [];

    if (models.length === 0) {
      console.log('⚠️  Nenhum modelo instalado!');
      console.log('\n📥 Modelos recomendados para baixar:');
      console.log('   docker exec -it <container> ollama pull llama3.2:latest');
      console.log('   docker exec -it <container> ollama pull llama3.1:latest');
      console.log('   docker exec -it <container> ollama pull phi3:latest');
      process.exit(1);
    }

    console.log(`✅ Encontrados ${models.length} modelos:\n`);

    for (const model of models) {
      const size = (model.size / 1024 / 1024 / 1024).toFixed(2);
      const modified = new Date(model.modified_at).toLocaleString('pt-BR');

      console.log(`📦 ${model.name}`);
      console.log(`   Tamanho: ${size} GB`);
      console.log(`   Modificado: ${modified}`);
      console.log(`   Digest: ${model.digest.substring(0, 20)}...`);
      console.log();
    }

    // Verifica modelos específicos
    const hasLlama32 = models.some((m: any) => m.name.includes('llama3.2'));
    const hasLlama31 = models.some((m: any) => m.name.includes('llama3.1'));
    const hasLlama3 = models.some((m: any) => m.name.includes('llama3'));
    const hasPhi = models.some((m: any) => m.name.includes('phi'));

    console.log('='.repeat(60));
    console.log('📊 Modelos Disponíveis para .env:');
    console.log('='.repeat(60));

    if (hasLlama32) {
      const model = models.find((m: any) => m.name.includes('llama3.2'));
      console.log(`✅ OLLAMA_MODEL=${model.name}`);
    }
    if (hasLlama31) {
      const model = models.find((m: any) => m.name.includes('llama3.1'));
      console.log(`✅ OLLAMA_MODEL=${model.name}`);
    }
    if (hasLlama3 && !hasLlama32 && !hasLlama31) {
      const model = models.find((m: any) => m.name.includes('llama3'));
      console.log(`✅ OLLAMA_MODEL=${model.name}`);
    }
    if (hasPhi) {
      const model = models.find((m: any) => m.name.includes('phi'));
      console.log(`✅ OLLAMA_MODEL=${model.name}`);
    }

    if (!hasLlama32 && !hasLlama31 && !hasLlama3 && !hasPhi) {
      console.log('⚠️  Nenhum modelo de chat recomendado encontrado');
      console.log('\n💡 Use o primeiro modelo disponível:');
      console.log(`   OLLAMA_MODEL=${models[0].name}`);
    }

    console.log('\n' + '='.repeat(60));

  } catch (error: any) {
    console.log('❌ Erro ao conectar com Ollama');
    console.log(`   Erro: ${error.message}`);
    console.log('\n💡 Verifique se o Docker está rodando:');
    console.log('   docker ps | grep ollama');
    console.log('\n💡 Ou inicie o Ollama:');
    console.log('   docker-compose up -d ollama');
    process.exit(1);
  }
}

checkOllamaModels().catch(console.error);
