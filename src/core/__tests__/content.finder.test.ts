import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import axios from 'axios';
import fs from 'fs/promises';
import { ContentFinder } from '../content.finder.js';
import { InstagramUser } from '../../types/index.js';

// Mock do axios
vi.mock('axios');
const mockedAxios = axios as { get: Mock };

// Mock do fs
vi.mock('fs/promises');
const mockedFs = fs as {
  mkdir: Mock;
  writeFile: Mock;
};

describe('ContentFinder', () => {
  let finder: ContentFinder;

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
      full_name: 'Test User 2',
      strong_id__: '987654321',
      id: '987654321',
      username: 'testuser2',
      is_private: true,
      is_verified: true,
      account_badges: ['verified'],
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
      latest_reel_media: 1234567890
    }
  ];

  beforeEach(() => {
    finder = new ContentFinder();
    vi.clearAllMocks();
  });

  describe('extractPostIdFromUrl', () => {
    it('should extract post ID from valid Instagram API URL', () => {
      const url = 'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers';
      const result = finder.extractPostIdFromUrl(url);
      expect(result).toBe('3723833150629057129_1448916808');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://invalid-url.com';
      const result = finder.extractPostIdFromUrl(url);
      expect(result).toBeNull();
    });

    it('should handle URLs without media ID', () => {
      const url = 'https://www.instagram.com/api/v1/media/likers';
      const result = finder.extractPostIdFromUrl(url);
      expect(result).toBeNull();
    });
  });

  describe('fetchPostData', () => {
    it('should fetch and return users data successfully', async () => {
      const mockResponse = {
        data: {
          users: mockUsers
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const url = 'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers';
      const result = await finder.fetchPostData(url);

      expect(mockedAxios.get).toHaveBeenCalledWith(url, {
        headers: expect.any(Object)
      });
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when API response has no users', async () => {
      const mockResponse = {
        data: {}
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const url = 'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers';
      const result = await finder.fetchPostData(url);

      expect(result).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const url = 'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers';
      const result = await finder.fetchPostData(url);

      expect(result).toEqual([]);
    });

    it('should handle timeout errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('timeout of 10000ms exceeded'));

      const url = 'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers';
      const result = await finder.fetchPostData(url);

      expect(result).toEqual([]);
    });
  });

  describe('saveUsersToJson', () => {
    it('should save users data to JSON file successfully', async () => {
      mockedFs.mkdir.mockResolvedValueOnce(undefined);
      mockedFs.writeFile.mockResolvedValueOnce(undefined);

      const postId = '3723833150629057129_1448916808';
      const result = await finder.saveUsersToJson(postId, mockUsers);

      expect(mockedFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('output'),
        { recursive: true }
      );

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(`${postId}-users.json`),
        expect.stringContaining('"totalUsers": 2'),
        'utf8'
      );

      expect(result).toEqual({
        success: true,
        filePath: expect.stringContaining(`${postId}-users.json`)
      });
    });

    it('should throw error for invalid input data', async () => {
      const postId = '';
      
      await expect(finder.saveUsersToJson(postId, mockUsers))
        .rejects.toThrow('Invalid data for saving');
    });

    it('should throw error for non-array users data', async () => {
      const postId = '3723833150629057129_1448916808';
      
      await expect(finder.saveUsersToJson(postId, null as any))
        .rejects.toThrow('Invalid data for saving');
    });

    it('should handle file system errors', async () => {
      mockedFs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));

      const postId = '3723833150629057129_1448916808';
      
      await expect(finder.saveUsersToJson(postId, mockUsers))
        .rejects.toThrow('Failed to save users');
    });
  });

  describe('processUrls', () => {
    it('should process multiple URLs successfully', async () => {
      const urls = [
        'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers',
        'https://www.instagram.com/api/v1/media/3727561195847795401_210278611/likers'
      ];

      // Mock das respostas da API
      mockedAxios.get
        .mockResolvedValueOnce({ data: { users: [mockUsers[0]] } })
        .mockResolvedValueOnce({ data: { users: [mockUsers[1]] } });

      // Mock do file system
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      // Spy no console.log para verificar output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await finder.processUrls(urls);

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing post: 3723833150629057129_1448916808')
      );

      consoleSpy.mockRestore();
    });

    it('should handle invalid URLs gracefully', async () => {
      const urls = [
        'https://invalid-url.com',
        'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers'
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: { users: mockUsers } });
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await finder.processUrls(urls);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid URL: https://invalid-url.com')
      );
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it('should handle API errors for individual URLs', async () => {
      const urls = [
        'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers'
      ];

      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await finder.processUrls(urls);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching post data:')
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty response from API', async () => {
      const urls = [
        'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers'
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: { users: [] } });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await finder.processUrls(urls);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No users found for post: 3723833150629057129_1448916808')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed API responses', async () => {
      const mockResponse = {
        data: 'invalid json'
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const url = 'https://www.instagram.com/api/v1/media/3723833150629057129_1448916808/likers';
      const result = await finder.fetchPostData(url);

      expect(result).toEqual([]);
    });

    it('should handle very large user arrays', async () => {
      const largeUserArray = Array.from({ length: 10000 }, (_, i) => ({
        ...mockUsers[0],
        pk: `user_${i}`,
        pk_id: `user_${i}`,
        id: `user_${i}`,
        username: `user_${i}`
      }));

      mockedFs.mkdir.mockResolvedValueOnce(undefined);
      mockedFs.writeFile.mockResolvedValueOnce(undefined);

      const postId = '3723833150629057129_1448916808';
      const result = await finder.saveUsersToJson(postId, largeUserArray);

      expect(result.success).toBe(true);
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(`${postId}-users.json`),
        expect.stringContaining('"totalUsers": 10000'),
        'utf8'
      );
    });
  });
});
