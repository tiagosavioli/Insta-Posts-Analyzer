// Configurações do sistema
export interface FinderConfig {
  parallelWorkers: number;
  requestDelay: number;
  fileDelay: number;
  requestTimeout: number;
  maxRetries: number;
}

export interface RankerConfig {
  weightFollowerFollowingRatio: number;
  weightIsPrivate: number;
  weightIsVerified: number;
  weightHasBiography: number;
  weightHasExternalUrl: number;
  weightMediaCount: number;
  weightHasStories: number;
  weightHasHighlights: number;
  weightUsernamePattern: number;
  weightFullNamePattern: number;
  weightFollowerCount: number;
  weightFollowingCount: number;
  weightAccountAge: number;
  weightHasChaining: number;
  weightIsBusiness: number;
  weightNumOfAdminedPages: number;
  weightHasHighlightReels: number;
  botThreshold: number;
}

export interface AppConfig {
  finder: FinderConfig;
  ranker: RankerConfig;
}

// Dados do usuário do Instagram
export interface FriendshipStatus {
  following: boolean;
  is_bestie: boolean;
  is_feed_favorite: boolean;
  is_private: boolean;
  is_restricted: boolean;
  incoming_request: boolean;
  outgoing_request: boolean;
  followed_by: boolean;
  muting: boolean;
  blocking: boolean;
  is_eligible_to_subscribe: boolean;
  subscribed: boolean;
  is_muting_reel: boolean;
  is_blocking_reel: boolean;
  is_muting_notes: boolean;
}

export interface InstagramUser {
  pk: string;
  pk_id: string;
  full_name: string;
  strong_id__: string;
  id: string;
  username: string;
  is_private: boolean;
  is_verified: boolean;
  profile_pic_id?: string;
  profile_pic_url?: string;
  account_badges: string[];
  friendship_status: FriendshipStatus;
  latest_reel_media: number;
  complement_error?: string;
  
  // Campos adicionais que podem existir
  followerCount?: number;
  followingCount?: number;
  mediaCount?: number;
  hasBiography?: boolean;
  hasExternalUrl?: boolean;
  hasStories?: boolean;
  hasHighlights?: boolean;
  hasChaining?: boolean;
  isBusiness?: boolean;
  numOfAdminedPages?: number;
  hasHighlightReels?: boolean;
  accountAge?: number;
}

// Usuário com score de bot
export interface UserWithBotScore extends InstagramUser {
  botScore: number;
  isBot: boolean;
}

// Análise de post
export interface PostAnalysis {
  timestamp: string;
  postId: string;
  totalUsers: number;
  totalPossibleBots: number;
  botPercentage: string;
  averageScore: string;
  possibleBots: UserWithBotScore[];
}

export interface AnalysisResult {
  analysis: PostAnalysis;
}

// Dados enriquecidos
export interface EnrichedData {
  timestamp: string;
  postId: string;
  totalUsers: number;
  enrichmentTimestamp: string;
  originalFile: string;
  users: InstagramUser[];
}

// Resposta da API
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

// Arquivos de análise
export interface AnalysisFile {
  postId: string;
  fileName: string;
  modified: string;
  rawData: AnalysisResult;
  analysis: PostAnalysis;
}

// Estatísticas globais
export interface GlobalStats {
  totalPosts: number;
  totalUsers: number;
  totalBots: number;
  avgBotPercentage: string;
}

// Processo de execução
export interface ProcessResult {
  success: boolean;
  message: string;
  stdout?: string;
  stderr?: string;
}
