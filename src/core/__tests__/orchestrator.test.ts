import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import fs from 'fs/promises';
import Orchestrator from '../orchestrator.js';
import { ContentFinder } from '../content.finder.js';
import { ContentRanker } from '../content.ranker.js';
import { InstagramUser } from '../../types/index.js';

// Mock das dependências
vi.mock('../content.finder.js');
vi.mock('../content.ranker.js');
vi.mock('fs/promises');

const MockedContentFinder = ContentFinder as Mock;
const MockedContentRanker = ContentRanker as Mock;
const mockedFs = fs as {
  mkdir: Mock;
  access: Mock;
  rename: Mock;
};

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  let mockContentFinder: any;
  let mockContentRanker: any;

  const mockUrls = [
    'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers',
    'https://www.instagram.com/api/v1/media/3727561195847795401_210278611/likers'
  ];

  const mockUsers: InstagramUser[] = [
    {
      pk: '123456789',
      pk_id: '123456789',
      full_name: 'Test User 1',
      strong_id__: '123456789',
      id: '123456789',
      username: 'testuser1',
      is_private: false,
      is_verified: false,
      account_badges: [],
      friendship_status: {
        following: false,
        is_bestie: false,
        is_feed_favorite: false,
        is_private: false,
        is_restricted: false,
        incoming_request: false,
        outgoing_request: false,
        followed_by: false,
        muting: false,
        blocking: false,
        is_eligible_to_subscribe: false,
        subscribed: false,
        is_muting_reel: false,
        is_blocking_reel: false,
        is_muting_notes: false
      },
      latest_reel_media: 0
    },
    {
      pk: '987654321',
      pk_id: '987654321',
      full_name: 'Bot User',
      strong_id__: '987654321',
      id: '987654321',
      username: 'bot_user_123456',
      is_private: true,
      is_verified: false,
      account_badges: [],
      friendship_status: {
        following: false,
        is_bestie: false,
        is_feed_favorite: false,
        is_private: true,
        is_restricted: false,
        incoming_request: false,
        outgoing_request: false,
        followed_by: false,
        muting: false,
        blocking: false,
        is_eligible_to_subscribe: false,
        subscribed: false,
        is_muting_reel: false,
        is_blocking_reel: false,
        is_muting_notes: false
      },
      latest_reel_media: 0
    }
  ];

  beforeEach(() => {
    // Setup mocks
    mockContentFinder = {
      extractPostIdFromUrl: vi.fn(),
      fetchPostData: vi.fn(),
      saveUsersToJson: vi.fn()
    };

    mockContentRanker = {
      processPostDirectory: vi.fn()
    };

    MockedContentFinder.mockImplementation(() => mockContentFinder);
    MockedContentRanker.mockImplementation(() => mockContentRanker);

    orchestrator = new Orchestrator(mockUrls);

    vi.clearAllMocks();
  });

  describe('extractPostIdFromUrl', () => {
    it('should extract post ID from valid URL', () => {
      const url = 'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers';
      const postId = (orchestrator as any).extractPostIdFromUrl(url);
      expect(postId).toBe('3723833150629057129_1448916808');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://invalid-url.com';
      const postId = (orchestrator as any).extractPostIdFromUrl(url);
      expect(postId).toBeNull();
    });
  });

  describe('createPostDirectory', () => {
    it('should create directory successfully', async () => {
      mockedFs.mkdir.mockResolvedValueOnce(undefined);

      const postId = '3723833150629057129_1448916808';
      const result = await (orchestrator as any).createPostDirectory(postId);

      expect(mockedFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining(`post-${postId}`),
        { recursive: true }
      );
      expect(result).toContain(`post-${postId}`);
    });

    it('should handle directory creation errors', async () => {
      mockedFs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));

      const postId = '3723833150629057129_1448916808';
      
      await expect((orchestrator as any).createPostDirectory(postId))
        .rejects.toThrow('Failed to create post directory');
    });
  });

  describe('organizePostFiles', () => {
    it('should organize files successfully when they exist', async () => {
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.rename.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const postId = '3723833150629057129_1448916808';
      await (orchestrator as any).organizePostFiles(postId);

      expect(mockedFs.access).toHaveBeenCalledTimes(2);
      expect(mockedFs.rename).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Moved: 3723833150629057129_1448916808-users.json')
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing files gracefully', async () => {
      mockedFs.access.mockRejectedValue(new Error('File not found'));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const postId = '3723833150629057129_1448916808';
      await (orchestrator as any).organizePostFiles(postId);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('File not found: 3723833150629057129_1448916808-users.json')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('processPost', () => {
    it('should process a post successfully', async () => {
      const url = 'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers';
      
      // Setup mocks
      mockContentFinder.fetchPostData.mockResolvedValueOnce(mockUsers);
      mockContentFinder.saveUsersToJson.mockResolvedValueOnce({
        success: true,
        filePath: '/path/to/file'
      });
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.rename.mockResolvedValue(undefined);
      mockContentRanker.processPostDirectory.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await (orchestrator as any).processPost(url);

      expect(mockContentFinder.fetchPostData).toHaveBeenCalledWith(url);
      expect(mockContentFinder.saveUsersToJson).toHaveBeenCalledWith(
        '3723833150629057129_1448916808',
        mockUsers
      );
      expect(mockContentRanker.processPostDirectory).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Post 3723833150629057129_1448916808 processed successfully')
      );

      consoleSpy.mockRestore();
    });

    it('should handle invalid URLs', async () => {
      const url = 'https://invalid-url.com';
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await (orchestrator as any).processPost(url);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid URL: https://invalid-url.com')
      );
      expect(mockContentFinder.fetchPostData).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle posts with no users', async () => {
      const url = 'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers';
      
      mockContentFinder.fetchPostData.mockResolvedValueOnce([]);
      mockedFs.mkdir.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await (orchestrator as any).processPost(url);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No users found for this post')
      );
      expect(mockContentFinder.saveUsersToJson).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle processing errors', async () => {
      const url = 'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers';
      
      mockContentFinder.fetchPostData.mockRejectedValueOnce(new Error('API Error'));
      mockedFs.mkdir.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await (orchestrator as any).processPost(url);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error processing post 3723833150629057129_1448916808:'),
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('run', () => {
    it('should process all posts successfully', async () => {
      // Setup mocks for successful processing
      mockContentFinder.fetchPostData.mockResolvedValue(mockUsers);
      mockContentFinder.saveUsersToJson.mockResolvedValue({
        success: true,
        filePath: '/path/to/file'
      });
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.rename.mockResolvedValue(undefined);
      mockContentRanker.processPostDirectory.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await orchestrator.run();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting Instagram Bot Analysis')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Posts to process: 2')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('All posts processed successfully!')
      );
      expect(mockContentFinder.fetchPostData).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });

    it('should handle empty URL list', async () => {
      const emptyOrchestrator = new Orchestrator([]);
      
      mockedFs.mkdir.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await emptyOrchestrator.run();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Posts to process: 0')
      );
      expect(mockContentFinder.fetchPostData).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle fatal errors gracefully', async () => {
      mockedFs.mkdir.mockRejectedValueOnce(new Error('Fatal file system error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(orchestrator.run()).rejects.toThrow('process.exit called');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('💥 Fatal error:'),
        expect.any(String)
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle mixed success and failure scenarios', async () => {
      // First URL succeeds, second fails
      mockContentFinder.fetchPostData
        .mockResolvedValueOnce(mockUsers)
        .mockRejectedValueOnce(new Error('Network error'));
      
      mockContentFinder.saveUsersToJson.mockResolvedValue({
        success: true,
        filePath: '/path/to/file'
      });

      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.rename.mockResolvedValue(undefined);
      mockContentRanker.processPostDirectory.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await orchestrator.run();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Post 3723833150629057129_1448916808 processed successfully')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error processing post 3727561195847795401_210278611:'),
        expect.any(String)
      );

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle large datasets efficiently', async () => {
      const largeUserArray = Array.from({ length: 5000 }, (_, i) => ({
        ...mockUsers[0],
        pk: `user_${i}`,
        username: `user_${i}`
      }));

      mockContentFinder.fetchPostData.mockResolvedValue(largeUserArray);
      mockContentFinder.saveUsersToJson.mockResolvedValue({
        success: true,
        filePath: '/path/to/file'
      });
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.rename.mockResolvedValue(undefined);
      mockContentRanker.processPostDirectory.mockResolvedValue(undefined);

      const startTime = Date.now();
      
      await (orchestrator as any).processPost(mockUrls[0]);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(1000); // Should process in less than 1 second
      expect(mockContentFinder.saveUsersToJson).toHaveBeenCalledWith(
        '3723833150629057129_1448916808',
        largeUserArray
      );
    });

    it('should maintain data integrity throughout the pipeline', async () => {
      mockContentFinder.fetchPostData.mockResolvedValueOnce(mockUsers);
      mockContentFinder.saveUsersToJson.mockResolvedValueOnce({
        success: true,
        filePath: '/path/to/file'
      });
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.rename.mockResolvedValue(undefined);
      mockContentRanker.processPostDirectory.mockResolvedValue(undefined);

      await (orchestrator as any).processPost(mockUrls[0]);

      // Verify that data flows correctly through the pipeline
      expect(mockContentFinder.fetchPostData).toHaveBeenCalledWith(mockUrls[0]);
      expect(mockContentFinder.saveUsersToJson).toHaveBeenCalledWith(
        '3723833150629057129_1448916808',
        mockUsers
      );
      expect(mockContentRanker.processPostDirectory).toHaveBeenCalledWith(
        expect.stringContaining('post-3723833150629057129_1448916808')
      );
    });
  });
});
