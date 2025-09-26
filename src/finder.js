import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

export class ContentFinder {
  constructor(finderConfig, headers) {
    this.finderConfig = finderConfig;
    this.headers = headers;
    this.outputDir = path.join(process.cwd(), 'output');
  }

  extractPostIdFromUrl(url) {
    const match = url.match(/\/media\/(\d+_\d+)/);
    return match ? match[1] : null;
  } 

  async #ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create output directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveUsersToJson(postId, usersData) {
    try {
      if (!postId || !usersData || !Array.isArray(usersData)) {
        throw new Error('Invalid data for saving');
      }

      await this.#ensureOutputDir();
      
      const fileName = `${postId}-users.json`;
      const filePath = path.join(this.outputDir, fileName);

      const result = {
        timestamp: new Date().toISOString(),
        postId: postId,
        totalUsers: usersData.length,
        users: usersData
      };

      await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf8');
      
      return {
        success: true,
        filePath
      };
    } catch (error) {
      throw new Error(`Failed to save users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Método simplificado para buscar dados de um post
  async fetchPostData(url) {
    try {

      const response = await axios.get(url, { 
        headers: this.headers,
        timeout: this.finderConfig.requestTimeout
      });

      return response.data;

    } catch (error) {
      console.error(`Error fetching post data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  // Método para processar uma lista de URLs
  async processUrls(urls) {
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