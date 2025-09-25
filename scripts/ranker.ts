import { ContentRanker } from '../src/core/content.ranker.js';
import { loadRankerConfig } from '../src/config.js';
import { RankerConfig } from '../src/types/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para carregar configurações dinâmicas
async function loadDynamicConfig(): Promise<RankerConfig> {
    try {
        return await loadRankerConfig();
    } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        throw error;
    }
}

// Script para executar o ContentRanker
async function runRanker(): Promise<void> {
    try {
        console.log('🤖 Content Ranker - Detecção de Bots');
        console.log('=====================================\n');
        
        // Carrega configurações dinâmicas
        const dynamicConfig = await loadDynamicConfig();
        
        // Mostra configuração atual
        console.log('Configuração utilizada:');
        console.log(`- Threshold para bot: ${dynamicConfig.botThreshold} (score > threshold = bot)`);
        console.log(`- Weight for username patterns: ${dynamicConfig.weightUsernamePattern} (positive = more suspicious)`);
        console.log(`- Weight for accounts without posts: ${dynamicConfig.weightMediaCount} (negative = less suspicious)`);
        console.log(`- Weight for verified accounts: ${dynamicConfig.weightIsVerified} (negative = less suspicious)`);
        console.log(`- Weight for managed pages: ${dynamicConfig.weightNumOfAdminedPages} (positive = more suspicious)`);
        console.log(`- Weight for highlight reels: ${dynamicConfig.weightHasHighlightReels} (negative = less suspicious)`);
        console.log(`- Lógica: Valores positivos = mais suspeito, valores negativos = menos suspeito\n`);
        
        // Cria instância do ranker com configuração dinâmica
        const ranker = new ContentRanker(dynamicConfig);
        
        // Processa todos os posts
        console.log('Iniciando análise de detecção de bots...\n');
        await ranker.processAllPosts();
        
        console.log('\nProcesso finalizado! Verifique os arquivos users.analysis.json na pasta output/');
        
    } catch (error) {
        console.error('Erro na execução:', error instanceof Error ? error.message : 'Erro desconhecido');
        process.exit(1);
    }
}

// Executa o script
runRanker();
