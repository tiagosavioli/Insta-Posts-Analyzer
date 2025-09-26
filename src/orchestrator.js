import { ContentFinder } from './finder.js';
import { ContentRanker } from './analyzer.js';
import { UserEnricher } from './user.enricher.js';
import fs from 'fs/promises';
import path from 'path';

export default class Orchestrator {
  constructor(postUrls, config) {
    this.postUrls = postUrls;
    this.config = config;
    this.finder = new ContentFinder(config.finder, config.headers);
    this.enricher = new UserEnricher(config.headers);
    this.analyzer = new ContentRanker(config.analyzer);
    this.outputDir = path.join(process.cwd(), 'output');
  }

  // Extrai post ID da URL
  #extractPostIdFromUrl(url) {
    // Extrai apenas o ID numérico do formato /media/XXXX_YYYY/
    const match = url.match(/\/media\/(\d+_\d+)/);
    return match ? match[1] : null;
  }

  // Cria diretório para o post
  async #createPostDirectory(postId) {
    try {
      const postDir = path.join(this.outputDir, `post-${postId}`);
      await fs.mkdir(postDir, { recursive: true });
      return postDir;
    } catch (error) {
      throw new Error(`Failed to create post directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Move e renomeia arquivos para a estrutura organizada
  async #organizePostFiles(postId) {
    try {
      const postDir = path.join(this.outputDir, `post-${postId}`);
      
      // Arquivos originais
      const originalUsersFile = path.join(this.outputDir, `${postId}-users.json`);
      const originalEnrichedFile = path.join(this.outputDir, `${postId}-enriched-users.json`);
      
      // Novos nomes
      const newUsersFile = path.join(postDir, 'users.json');
      const newEnrichedFile = path.join(postDir, 'users.enriched.json');
      
      // Move e renomeia arquivos se existirem
      try {
        await fs.access(originalUsersFile);
        await fs.rename(originalUsersFile, newUsersFile);
      } catch (error) {
        // Arquivo não encontrado, continua
      }

      try {
        await fs.access(originalEnrichedFile);
        await fs.rename(originalEnrichedFile, newEnrichedFile);
      } catch (error) {
        // Arquivo não encontrado, continua
      }
    } catch (error) {
      console.error(`Error organizing files for ${postId}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Processa um post específico
  async #processPost(url) {
    const postId = this.#extractPostIdFromUrl(url);
    
    if (!postId) {
      console.error(`❌ Invalid URL: ${url}`);
      return;
    }

    try {
      // Verifica se já existe diretório para este post
      const existingPostDir = path.join(this.outputDir, `post-${postId}`);
      let postDir = existingPostDir;
      
      try {
        await fs.access(existingPostDir);
      } catch {
        // Se não existe, cria um novo
        postDir = await this.#createPostDirectory(postId);
      }
      
      // Busca dados do post
      console.log('📊 Buscando dados do post...');
      const users = await this.finder.fetchPostData(url);
      
      if (users.length === 0) {
        console.log('⚠️ Nenhum usuário encontrado para este post');
        return;
      }

      console.log(`📊 Encontrados ${users.length} usuários`);
      
      // Salva dados iniciais
      console.log('💾 Salvando dados iniciais...');
      await this.finder.saveUsersToJson(postId, users);
      
      // Organiza arquivos na estrutura correta
      await this.#organizePostFiles(postId);
      
      // Enriquece dados dos usuários
      console.log('🔍 Enriquecendo dados dos usuários...');
      const usersFilePath = path.join(postDir, 'users.json');
      const enrichedFilePath = path.join(postDir, 'users.enriched.json');
      await this.enricher.processUsersFile(usersFilePath, enrichedFilePath);
      
      // Processa análise de bots
      await this.analyzer.processPostDirectory(postDir);
      
      console.log(`✅ Post ${postId} processed successfully`);
      
    } catch (error) {
      console.error(`❌ Error processing post ${postId}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Executa o processamento de todos os posts
  async run() {
    console.log('🚀 Starting Instagram Bot Analysis');
    console.log(`📋 Posts to process: ${this.postUrls.length}`);
    
    try {
      // Garante que o diretório de output existe
      await fs.mkdir(this.outputDir, { recursive: true });
      
      // Processa cada post
      for (let i = 0; i < this.postUrls.length; i++) {
        const url = this.postUrls[i];
        await this.#processPost(url);
      }
      
      console.log('\n🎉 All posts processed successfully!');
      console.log(`📁 Results saved in: ${this.outputDir}`);
      
    } catch (error) {
      console.error('💥 Fatal error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }
}
