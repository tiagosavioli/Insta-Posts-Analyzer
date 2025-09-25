import { ContentFinder } from './content.finder.js';
import { ContentRanker } from './content.ranker.js';
import fs from 'fs/promises';
import path from 'path';

export default class Orchestrator {
  private postUrls: string[];
  private postFinder: ContentFinder;
  private botRanker: ContentRanker;
  private outputDir: string;

  constructor(postUrls: string[]) {
    this.postUrls = postUrls;
    this.postFinder = new ContentFinder();
    this.botRanker = new ContentRanker();
    this.outputDir = path.join(process.cwd(), 'output');
  }

  // Extrai post ID da URL
  private extractPostIdFromUrl(url: string): string | null {
    const match = url.match(/\/media\/(\d+_\d+)/);
    return match ? match[1] : null;
  }

  // Cria diretório para o post
  private async createPostDirectory(postId: string): Promise<string> {
    try {
      const postDir = path.join(this.outputDir, `post-${postId}`);
      await fs.mkdir(postDir, { recursive: true });
      return postDir;
    } catch (error) {
      throw new Error(`Failed to create post directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Move e renomeia arquivos para a estrutura organizada
  private async organizePostFiles(postId: string): Promise<void> {
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
        console.log(`✓ Moved: ${postId}-users.json → post-${postId}/users.json`);
      } catch (error) {
        console.log(`⚠ File not found: ${postId}-users.json`);
      }

      try {
        await fs.access(originalEnrichedFile);
        await fs.rename(originalEnrichedFile, newEnrichedFile);
        console.log(`✓ Moved: ${postId}-enriched-users.json → post-${postId}/users.enriched.json`);
      } catch (error) {
        console.log(`⚠ File not found: ${postId}-enriched-users.json`);
      }
    } catch (error) {
      console.error(`Error organizing files for ${postId}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Processa um post específico
  private async processPost(url: string): Promise<void> {
    const postId = this.extractPostIdFromUrl(url);
    
    if (!postId) {
      console.error(`❌ Invalid URL: ${url}`);
      return;
    }

    console.log(`\n📸 Processing Post: ${postId}`);
    console.log(`🔗 URL: ${url}`);
    
    try {
      // Cria diretório do post
      await this.createPostDirectory(postId);
      
      // Busca dados do post
      console.log('📊 Fetching post data...');
      const users = await this.postFinder.fetchPostData(url);
      
      if (users.length === 0) {
        console.log('⚠ No users found for this post');
        return;
      }

      // Salva dados iniciais
      await this.postFinder.saveUsersToJson(postId, users);
      
      // Organiza arquivos na estrutura correta
      await this.organizePostFiles(postId);
      
      // Processa análise de bots
      console.log('🤖 Running bot analysis...');
      const postDir = path.join(this.outputDir, `post-${postId}`);
      await this.botRanker.processPostDirectory(postDir);
      
      console.log(`✅ Post ${postId} processed successfully`);
      
    } catch (error) {
      console.error(`❌ Error processing post ${postId}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Executa o processamento de todos os posts
  public async run(): Promise<void> {
    console.log('🚀 Starting Instagram Bot Analysis');
    console.log('==================================');
    console.log(`📋 Posts to process: ${this.postUrls.length}`);
    
    try {
      // Garante que o diretório de output existe
      await fs.mkdir(this.outputDir, { recursive: true });
      
      // Processa cada post
      for (let i = 0; i < this.postUrls.length; i++) {
        const url = this.postUrls[i];
        console.log(`\n[${i + 1}/${this.postUrls.length}] Processing URL...`);
        await this.processPost(url);
      }
      
      console.log('\n🎉 All posts processed successfully!');
      console.log(`📁 Results saved in: ${this.outputDir}`);
      
    } catch (error) {
      console.error('💥 Fatal error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }
}
