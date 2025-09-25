import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { loadFinderConfig, headerConfig } from '../config.js';
import { FinderConfig, InstagramUser } from '../types/index.js';

export class ContentFinder {
  private config: FinderConfig | null = null;
  private headers: Record<string, string>;
  private outputDir: string;

  constructor() {
    this.headers = headerConfig;
    this.outputDir = path.join(process.cwd(), 'output');
  }

  private async getConfig(): Promise<FinderConfig> {
    if (!this.config) {
      this.config = await loadFinderConfig();
    }
    return this.config;
  }

  public extractPostIdFromUrl(url: string): string | null {
    const match = url.match(/\/media\/(\d+_\d+)/);
    return match ? match[1] : null;
  }

  private async ensureOutputDir(): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create output directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async saveUsersToJson(postId: string, usersData: InstagramUser[]): Promise<{ success: boolean; filePath: string }> {
    try {
      if (!postId || !usersData || !Array.isArray(usersData)) {
        throw new Error('Invalid data for saving');
      }

      await this.ensureOutputDir();
      
      const fileName = `${postId}-users.json`;
      const filePath = path.join(this.outputDir, fileName);

      const result = {
        timestamp: new Date().toISOString(),
        postId: postId,
        totalUsers: usersData.length,
        users: usersData
      };

      await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf8');
      
      console.log(`File saved: ${fileName}`);
      console.log(`Total users: ${usersData.length}`);
      
      return {
        success: true,
        filePath
      };
    } catch (error) {
      throw new Error(`Failed to save users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Método simplificado para buscar dados de um post
  public async fetchPostData(url: string): Promise<InstagramUser[]> {
    try {
      const response = await axios.get(url, { headers: this.headers });
      
      if (response.data && response.data.users) {
        return response.data.users;
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching post data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  // Método para processar uma lista de URLs
  public async processUrls(urls: string[]): Promise<void> {
    for (const url of urls) {
      const postId = this.extractPostIdFromUrl(url);
      
      if (!postId) {
        console.error(`Invalid URL: ${url}`);
        continue;
      }

      console.log(`Processing post: ${postId}`);
      
      try {
        const users = await this.fetchPostData(url);
        
        if (users.length > 0) {
          await this.saveUsersToJson(postId, users);
        } else {
          console.log(`No users found for post: ${postId}`);
        }
      } catch (error) {
        console.error(`Error processing ${postId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
}
