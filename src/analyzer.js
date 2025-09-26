import fs from 'fs/promises';
import path from 'path';

export class ContentRanker {
  constructor(rankerConfig) {
    this.weights = rankerConfig;
    this.outputDir = path.join(process.cwd(), 'output');
  }

  async #getWeights() {
    return this.weights;
  }

  // Analisa padrões suspeitos no username
  #analyzeUsernamePattern(username) {
    if (!username) return 0;
    
    let score = 0;
    
    // Usernames muito curtos ou muito longos
    if (username.length < 3) score += 0.3;
    if (username.length > 20) score += 0.2;
    
    // Muitos números consecutivos
    if (/\d{4,}/.test(username)) score += 0.3;
    
    // Muitos underscores ou pontos
    const specialChars = (username.match(/[._]/g) || []).length;
    if (specialChars > 2) score += 0.2;
    
    // Padrões repetitivos
    if (/(.)\1{2,}/.test(username)) score += 0.2;
    
    // Nomes genéricos
    const genericNames = ['user', 'test', 'bot', 'fake', 'spam', 'temp'];
    if (genericNames.some(name => username.toLowerCase().includes(name))) {
      score += 0.4;
    }
    
    return Math.min(score, 1);
  }

  // Analisa padrões suspeitos no nome completo
  #analyzeFullNamePattern(fullName) {
    if (!fullName) return 0.2; // Sem nome é suspeito
    
    let score = 0;
    
    // Nome muito curto ou muito longo
    if (fullName.length < 2) score += 0.3;
    if (fullName.length > 50) score += 0.1;
    
    // Muitos números no nome
    const numberCount = (fullName.match(/\d/g) || []).length;
    if (numberCount > 3) score += 0.2;
    
    // Caracteres especiais excessivos
    const specialChars = (fullName.match(/[^a-zA-Z0-9\s]/g) || []).length;
    if (specialChars > 3) score += 0.2;
    
    // Nomes genéricos ou suspeitos
    const suspiciousNames = ['test', 'fake', 'bot', 'spam', 'user', 'account'];
    if (suspiciousNames.some(name => fullName.toLowerCase().includes(name))) {
      score += 0.3;
    }
    
    return Math.min(score, 1);
  }

  // Calcula ratio de seguidores para seguindo
  #calculateFollowerFollowingRatio(followerCount, followingCount) {
    if (followingCount === 0) return followerCount > 0 ? 10 : 1; // Évita divisão por zero
    
    const ratio = followerCount / followingCount;
    
    // Ratios muito baixos ou muito altos são suspeitos
    if (ratio < 0.1) return 1; // Segue muito mais do que é seguido
    if (ratio > 10) return 0; // Muito mais seguidores que seguindo (provável influencer)
    
    // Ratio normal (entre 0.1 e 10)
    return Math.max(0, (1 - ratio) * 0.5); // Quanto menor o ratio, mais suspeito
  }

  // Estima idade da conta baseado em métricas
  #estimateAccountAge(user) {
    // Critérios simples para estimar idade da conta
    // Contas mais estabelecidas tendem a ter mais posts, bio, etc.
    
    let ageScore = 0;
    
    // Tem biografia
    if (user.hasBiography) ageScore += 0.2;
    
    // Tem URL externa
    if (user.hasExternalUrl) ageScore += 0.1;
    
    // Tem muitos posts
    if (user.mediaCount && user.mediaCount > 10) ageScore += 0.3;
    if (user.mediaCount && user.mediaCount > 50) ageScore += 0.2;
    
    // Tem stories ou highlights
    if (user.hasStories) ageScore += 0.1;
    if (user.hasHighlights) ageScore += 0.1;
    
    // É conta business
    if (user.isBusiness) ageScore += 0.2;
    
    return Math.min(ageScore, 1);
  }

  // Calcula score de bot para um usuário
  async calculateBotScore(user) {
    const weights = await this.#getWeights();
    let score = 0;
    
    // Profile analysis
    const followerFollowingRatio = this.#calculateFollowerFollowingRatio(
      user.followerCount || 0, 
      user.followingCount || 0
    );
    score += followerFollowingRatio * weights.weightFollowerFollowingRatio;
    
    score += (user.is_private ? 1 : 0) * weights.weightIsPrivate;
    score += (user.is_verified ? 1 : 0) * weights.weightIsVerified;
    score += (user.hasBiography ? 1 : 0) * weights.weightHasBiography;
    score += (user.hasExternalUrl ? 1 : 0) * weights.weightHasExternalUrl;
    
    // Activity analysis
    const mediaScore = user.mediaCount ? Math.min(user.mediaCount / 100, 1) : 0;
    score += mediaScore * weights.weightMediaCount;
    
    score += (user.hasStories ? 1 : 0) * weights.weightHasStories;
    score += (user.hasHighlights ? 1 : 0) * weights.weightHasHighlights;
    
    // Name/username analysis
    const usernamePattern = this.#analyzeUsernamePattern(user.username);
    score += usernamePattern * weights.weightUsernamePattern;
    
    const fullNamePattern = this.#analyzeFullNamePattern(user.full_name);
    score += fullNamePattern * weights.weightFullNamePattern;
    
    // Engagement analysis
    const followerScore = user.followerCount ? Math.min(user.followerCount / 1000, 1) : 0;
    score += followerScore * weights.weightFollowerCount;
    
    const followingScore = user.followingCount ? Math.min(user.followingCount / 1000, 1) : 0;
    score += followingScore * weights.weightFollowingCount;
    
    // Account age
    const accountAge = this.#estimateAccountAge(user);
    score += accountAge * weights.weightAccountAge;
    
    // Behavior analysis
    score += (user.hasChaining ? 1 : 0) * weights.weightHasChaining;
    score += (user.isBusiness ? 1 : 0) * weights.weightIsBusiness;
    
    const adminPagesScore = user.numOfAdminedPages ? Math.min(user.numOfAdminedPages / 5, 1) : 0;
    score += adminPagesScore * weights.weightNumOfAdminedPages;
    
    score += (user.hasHighlightReels ? 1 : 0) * weights.weightHasHighlightReels;
    
    return parseFloat(score.toFixed(3));
  }

  // Determina se um usuário é bot baseado no threshold
  async isBot(user) {
    const score = await this.calculateBotScore(user);
    const weights = await this.#getWeights();
    return score > weights.botThreshold;
  }

  // Analisa um arquivo de usuários enriquecidos
  async analyzeEnrichedFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const enrichedData = JSON.parse(data);
      
      const usersWithScores = await Promise.all(
        enrichedData.users.map(async (user) => ({
          ...user,
          botScore: await this.calculateBotScore(user),
          isBot: await this.isBot(user)
        }))
      );
      
      const possibleBots = usersWithScores.filter(user => user.isBot);
      const totalUsers = usersWithScores.length;
      const totalBots = possibleBots.length;
      const botPercentage = totalUsers > 0 ? ((totalBots / totalUsers) * 100).toFixed(2) : '0.00';
      
      const averageScore = totalUsers > 0 
        ? (usersWithScores.reduce((sum, user) => sum + user.botScore, 0) / totalUsers).toFixed(3)
        : '0.000';
      
      const analysis = {
        timestamp: new Date().toISOString(),
        postId: enrichedData.postId,
        totalUsers,
        totalPossibleBots: totalBots,
        botPercentage,
        averageScore,
        possibleBots,
        allUsers: usersWithScores // Incluir todos os usuários com pontuações
      };
      
      return { analysis };
      
    } catch (error) {
      throw new Error(`Erro ao analisar arquivo: ${error}`);
    }
  }

  // Processa todos os arquivos de uma pasta
  async processPostDirectory(postDir) {
    const enrichedFilePath = path.join(postDir, 'users.enriched.json');
    const outputFilePath = path.join(postDir, 'users.analysis.json');
    
    try {
      await fs.access(enrichedFilePath);
    } catch {
      return;
    }
    
    try {
      const result = await this.analyzeEnrichedFile(enrichedFilePath);
      await fs.writeFile(outputFilePath, JSON.stringify(result, null, 2));
      
      const stats = result.analysis;
      console.log(`✓ Post ${stats.postId}: ${stats.totalPossibleBots}/${stats.totalUsers} bots (${stats.botPercentage}%)`);
      
    } catch (error) {
      console.error(`Erro ao processar ${postDir}:`, error);
    }
  }

  // Processa todos os posts no diretório output
  async processAllPosts() {
    try {
      const entries = await fs.readdir(this.outputDir, { withFileTypes: true });
      const postDirs = entries
        .filter(entry => entry.isDirectory() && entry.name.startsWith('post-'))
        .map(entry => path.join(this.outputDir, entry.name));
      
      if (postDirs.length === 0) {
        return;
      }
      
      for (const postDir of postDirs) {
        await this.processPostDirectory(postDir);
      }
      
    } catch (error) {
      console.error('Erro ao processar posts:', error);
      throw error;
    }
  }

  // Obtém configuração atual
  async getWeightsPublic() {
    const weights = await this.#getWeights();
    return { ...weights };
  }

  // Atualiza configuração
  async updateWeights(newWeights) {
    const currentWeights = await this.#getWeights();
    this.weights = {
      ...currentWeights,
      ...newWeights
    };
  }
}
