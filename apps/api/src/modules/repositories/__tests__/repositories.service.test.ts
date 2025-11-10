/**
 * Unit tests for RepositoriesService
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RepositoriesService } from '../repositories.service';
import { prisma } from '../../../database/prisma.client';
import { redis, deletePattern } from '../../../database/redis.client';
import { decryptGitHubToken } from '../../../utils/encryption';
import { Octokit } from '@octokit/rest';
import { config } from '../../../config';

// Mock dependencies
jest.mock('../../../database/prisma.client');
jest.mock('../../../database/redis.client');
jest.mock('../../../utils/encryption');
jest.mock('@octokit/rest');
jest.mock('../../../config', () => ({
  config: {
    github: {
      webhookSecret: 'test-webhook-secret',
    },
    apiUrl: 'http://localhost:3001',
    database: {
      url: 'postgresql://test:test@localhost:5432/test',
    },
    redis: {
      url: 'redis://localhost:6379',
      host: 'localhost',
      port: 6379,
    },
  },
}));
jest.mock('../../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('RepositoriesService', () => {
  let repositoriesService: RepositoriesService;
  let mockRedisGet: jest.Mock<any>;
  let mockRedisSetex: jest.Mock<any>;
  let mockRedisDel: jest.Mock<any>;
  let mockDeletePattern: jest.Mock<any>;
  let mockPrismaUserFindUnique: jest.Mock<any>;
  let mockPrismaUserOrganizationFindMany: jest.Mock<any>;
  let mockPrismaUserOrganizationFindFirst: jest.Mock<any>;
  let mockPrismaRepositoryFindMany: jest.Mock<any>;
  let mockPrismaRepositoryFindFirst: jest.Mock<any>;
  let mockPrismaRepositoryFindUnique: jest.Mock<any>;
  let mockPrismaRepositoryCreate: jest.Mock<any>;
  let mockPrismaRepositoryUpdate: jest.Mock<any>;
  let mockPrismaRepositoryDelete: jest.Mock<any>;
  let mockPrismaAuditLogCreate: jest.Mock<any>;
  let mockPrismaTransaction: jest.Mock<any>;
  let mockOctokitInstance: any;
  let mockDecryptGitHubToken: jest.Mock<any>;

  beforeEach(() => {
    repositoriesService = new RepositoriesService();

    // Setup Redis mocks
    mockRedisGet = jest.fn() as any;
    mockRedisSetex = jest.fn() as any;
    mockRedisDel = jest.fn() as any;
    mockDeletePattern = jest.fn() as any;
    (redis.get as any) = mockRedisGet;
    (redis.setex as any) = mockRedisSetex;
    (redis.del as any) = mockRedisDel;
    (deletePattern as any) = mockDeletePattern;

    // Setup Prisma mocks
    mockPrismaUserFindUnique = jest.fn() as any;
    mockPrismaUserOrganizationFindMany = jest.fn() as any;
    mockPrismaUserOrganizationFindFirst = jest.fn() as any;
    mockPrismaRepositoryFindMany = jest.fn() as any;
    mockPrismaRepositoryFindFirst = jest.fn() as any;
    mockPrismaRepositoryFindUnique = jest.fn() as any;
    mockPrismaRepositoryCreate = jest.fn() as any;
    mockPrismaRepositoryUpdate = jest.fn() as any;
    mockPrismaRepositoryDelete = jest.fn() as any;
    mockPrismaAuditLogCreate = jest.fn() as any;
    mockPrismaTransaction = jest.fn() as any;

    // Ensure prisma mock structure exists
    (prisma as any).user = (prisma as any).user || {};
    (prisma as any).userOrganization = (prisma as any).userOrganization || {};
    (prisma as any).repository = (prisma as any).repository || {};
    (prisma as any).auditLog = (prisma as any).auditLog || {};

    (prisma.user.findUnique as any) = mockPrismaUserFindUnique;
    (prisma.userOrganization.findMany as any) = mockPrismaUserOrganizationFindMany;
    (prisma.userOrganization.findFirst as any) = mockPrismaUserOrganizationFindFirst;
    (prisma.repository.findMany as any) = mockPrismaRepositoryFindMany;
    (prisma.repository.findFirst as any) = mockPrismaRepositoryFindFirst;
    (prisma.repository.findUnique as any) = mockPrismaRepositoryFindUnique;
    (prisma.repository.create as any) = mockPrismaRepositoryCreate;
    (prisma.repository.update as any) = mockPrismaRepositoryUpdate;
    (prisma.repository.delete as any) = mockPrismaRepositoryDelete;
    (prisma.auditLog.create as any) = mockPrismaAuditLogCreate;
    (prisma.$transaction as any) = mockPrismaTransaction;

    // Setup encryption mock
    mockDecryptGitHubToken = jest.fn() as any;
    (decryptGitHubToken as any) = mockDecryptGitHubToken;

    // Setup Octokit mock
    mockOctokitInstance = {
      repos: {
        listForAuthenticatedUser: jest.fn(),
        get: jest.fn(),
        createWebhook: jest.fn(),
        deleteWebhook: jest.fn(),
      },
    };
    (Octokit as unknown as jest.Mock).mockImplementation(() => mockOctokitInstance);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listAvailableRepositories', () => {
    const mockUserId = 'user-123';
    const mockUser = {
      id: mockUserId,
      accessToken: 'encrypted_token',
    };
    const mockGitHubToken = 'gho_test_token';
    const mockRepos = [
      {
        id: 1,
        name: 'repo1',
        full_name: 'owner/repo1',
        description: 'Test repo 1',
        language: 'TypeScript',
        stargazers_count: 10,
        forks_count: 5,
        open_issues_count: 2,
        private: false,
        default_branch: 'main',
        html_url: 'https://github.com/owner/repo1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        pushed_at: '2024-01-03T00:00:00Z',
      },
      {
        id: 2,
        name: 'repo2',
        full_name: 'owner/repo2',
        description: 'Test repo 2',
        language: 'JavaScript',
        stargazers_count: 20,
        forks_count: 10,
        open_issues_count: 3,
        private: true,
        default_branch: 'main',
        html_url: 'https://github.com/owner/repo2',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        pushed_at: null,
      },
    ];

    it('should return cached results if available', async () => {
      const cachedResult = {
        data: mockRepos.map((r) => ({
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          description: r.description,
          language: r.language,
          stars: r.stargazers_count,
          forks: r.forks_count,
          openIssues: r.open_issues_count,
          isPrivate: r.private,
          defaultBranch: r.default_branch,
          url: r.html_url,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          pushedAt: r.pushed_at,
        })),
        pagination: {
          page: 1,
          perPage: 30,
          total: 2,
          hasMore: false,
        },
      };

      mockRedisGet.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await repositoriesService.listAvailableRepositories(mockUserId);

      expect(result).toEqual(cachedResult);
      expect(mockRedisGet).toHaveBeenCalledWith(
        `repos:available:${mockUserId}:all:updated:1:30`
      );
      expect(mockPrismaUserFindUnique).not.toHaveBeenCalled();
      expect(mockOctokitInstance.repos.listForAuthenticatedUser).not.toHaveBeenCalled();
    });

    it('should fetch from GitHub and cache results', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockPrismaUserFindUnique.mockResolvedValue(mockUser);
      mockDecryptGitHubToken.mockReturnValue(mockGitHubToken);
      mockPrismaUserOrganizationFindMany.mockResolvedValue([
        { orgId: 'org-1', userId: 'user-123', role: 'ADMIN', joinedAt: new Date() },
      ]);
      mockPrismaRepositoryFindMany.mockResolvedValue([]);
      mockOctokitInstance.repos.listForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
        headers: {
          'x-ratelimit-remaining': '5000',
        },
      });
      mockRedisSetex.mockResolvedValue('OK');

      const result = await repositoriesService.listAvailableRepositories(mockUserId);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.perPage).toBe(30);
      expect(mockPrismaUserFindUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: { id: true, accessToken: true },
      });
      expect(mockDecryptGitHubToken).toHaveBeenCalledWith(mockUser.accessToken);
      expect(mockOctokitInstance.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        page: 1,
        per_page: 30,
        type: 'all',
        sort: 'updated',
      });
      expect(mockRedisSetex).toHaveBeenCalled();
    });

    it('should filter out connected repositories', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockPrismaUserFindUnique.mockResolvedValue(mockUser as any);
      mockDecryptGitHubToken.mockReturnValue(mockGitHubToken);
      mockPrismaUserOrganizationFindMany.mockResolvedValue([
        { orgId: 'org-1', userId: 'user-123', role: 'ADMIN', joinedAt: new Date() },
      ] as any);
      // Repo with id 1 is already connected
      mockPrismaRepositoryFindMany.mockResolvedValue([
        { githubId: BigInt(1) },
      ] as any);
      mockOctokitInstance.repos.listForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
        headers: {
          'x-ratelimit-remaining': '5000',
        },
      });
      mockRedisSetex.mockResolvedValue('OK');

      const result = await repositoriesService.listAvailableRepositories(mockUserId);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(2);
      expect(result.data[0].name).toBe('repo2');
    });

    it('should throw error if user not found', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockPrismaUserFindUnique.mockResolvedValue(null);

      await expect(
        repositoriesService.listAvailableRepositories(mockUserId)
      ).rejects.toThrow('User not found');
    });

    it('should throw error if access token not found', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockPrismaUserFindUnique.mockResolvedValue({
        id: mockUserId,
        accessToken: null,
      } as any);

      await expect(
        repositoriesService.listAvailableRepositories(mockUserId)
      ).rejects.toThrow('GitHub access token not found');
    });

    it('should throw error if GitHub authentication fails', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockPrismaUserFindUnique.mockResolvedValue(mockUser as any);
      mockDecryptGitHubToken.mockReturnValue(mockGitHubToken);
      mockOctokitInstance.repos.listForAuthenticatedUser.mockRejectedValue({
        status: 401,
        message: 'Bad credentials',
      });

      await expect(
        repositoriesService.listAvailableRepositories(mockUserId)
      ).rejects.toThrow('GitHub authentication failed');
    });

    it('should throw error if rate limit exceeded', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockPrismaUserFindUnique.mockResolvedValue(mockUser as any);
      mockDecryptGitHubToken.mockReturnValue(mockGitHubToken);
      mockOctokitInstance.repos.listForAuthenticatedUser.mockRejectedValue({
        status: 403,
        message: 'API rate limit exceeded',
      });

      await expect(
        repositoriesService.listAvailableRepositories(mockUserId)
      ).rejects.toThrow('GitHub rate limit exceeded');
    });

    it('should handle pagination options', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockPrismaUserFindUnique.mockResolvedValue(mockUser as any);
      mockDecryptGitHubToken.mockReturnValue(mockGitHubToken);
      mockPrismaUserOrganizationFindMany.mockResolvedValue([] as any);
      mockPrismaRepositoryFindMany.mockResolvedValue([] as any);
      mockOctokitInstance.repos.listForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
        headers: {
          'x-ratelimit-remaining': '5000',
        },
      });
      mockRedisSetex.mockResolvedValue('OK');

      await repositoriesService.listAvailableRepositories(mockUserId, {
        page: 2,
        perPage: 50,
        type: 'owner',
        sort: 'created',
      });

      expect(mockOctokitInstance.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        page: 2,
        per_page: 50,
        type: 'owner',
        sort: 'created',
      });
    });
  });

  describe('invalidateCache', () => {
    it('should delete all cache keys for user', async () => {
      const mockUserId = 'user-123';
      const pattern = `repos:available:${mockUserId}:*`;

      mockDeletePattern.mockResolvedValue(2);

      await repositoriesService.invalidateCache(mockUserId);

      expect(mockDeletePattern).toHaveBeenCalledWith(pattern);
    });

    it('should handle no cache keys found', async () => {
      const mockUserId = 'user-123';
      const pattern = `repos:available:${mockUserId}:*`;

      mockDeletePattern.mockResolvedValue(0);

      await repositoriesService.invalidateCache(mockUserId);

      expect(mockDeletePattern).toHaveBeenCalledWith(pattern);
    });
  });

  describe('connectRepository', () => {
    const mockUserId = 'user-123';
    const mockOrgId = 'org-456';
    const mockGithubRepoId = 123456789;
    const mockIpAddress = '127.0.0.1';
    const mockUser = {
      id: mockUserId,
      accessToken: 'encrypted_token',
    };
    const mockGitHubToken = 'gho_test_token';
    const mockGitHubRepo = {
      id: mockGithubRepoId,
      name: 'test-repo',
      full_name: 'owner/test-repo',
      description: 'Test repository',
      language: 'TypeScript',
      private: false,
      permissions: {
        admin: true,
        push: true,
        pull: true,
      },
      owner: {
        login: 'owner',
      },
    };
    const mockCreatedRepo = {
      id: 'repo-uuid',
      orgId: mockOrgId,
      githubId: BigInt(mockGithubRepoId),
      name: 'test-repo',
      fullName: 'owner/test-repo',
      description: 'Test repository',
      language: 'TypeScript',
      isPrivate: false,
      webhookId: null,
      syncStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockWebhook = {
      id: 456789,
      config: {
        url: 'http://localhost:3001/api/webhooks/github',
      },
    };

    beforeEach(() => {
      // Default successful mocks
      mockPrismaUserOrganizationFindFirst.mockResolvedValue({
        userId: mockUserId,
        orgId: mockOrgId,
        role: 'ADMIN',
        joinedAt: new Date(),
      } as any);
      mockPrismaRepositoryFindFirst.mockResolvedValue(null); // Not already connected
      mockPrismaUserFindUnique.mockResolvedValue(mockUser as any);
      mockDecryptGitHubToken.mockReturnValue(mockGitHubToken);
      mockOctokitInstance.repos.listForAuthenticatedUser.mockResolvedValue({
        data: [mockGitHubRepo],
      });
      mockOctokitInstance.repos.get.mockResolvedValue({
        data: mockGitHubRepo,
      });
      mockOctokitInstance.repos.createWebhook.mockResolvedValue({
        data: mockWebhook,
      });
      mockPrismaRepositoryCreate.mockResolvedValue({
        ...mockCreatedRepo,
        webhookSecret: 'test-secret',
        lastSyncedAt: null,
        aiReviewEnabled: true,
        sensitivityLevel: 'NORMAL',
        webhookRateLimit: 1000,
      } as any);
      mockPrismaRepositoryUpdate.mockResolvedValue({
        ...mockCreatedRepo,
        webhookId: BigInt(mockWebhook.id),
        webhookSecret: 'test-secret',
        lastSyncedAt: null,
        aiReviewEnabled: true,
        sensitivityLevel: 'NORMAL',
        webhookRateLimit: 1000,
      } as any);
      mockPrismaAuditLogCreate.mockResolvedValue({
        id: 'audit-123',
        userId: mockUserId,
        orgId: mockOrgId,
        action: 'REPOSITORY_CONNECTED',
        resource: `repository:${mockCreatedRepo.id}`,
        status: 'success',
        createdAt: new Date(),
      } as any);
      mockDeletePattern.mockResolvedValue(1);
      mockRedisDel.mockResolvedValue(1);

      // Mock transaction
      mockPrismaTransaction.mockImplementation(async (callback: any) => {
        const tx = {
          repository: {
            create: mockPrismaRepositoryCreate,
            update: mockPrismaRepositoryUpdate,
          },
          auditLog: {
            create: mockPrismaAuditLogCreate,
          },
        };
        return await callback(tx);
      });

      // Mock getRepositoryWithStats (called at end of connectRepository)
      // This is called after transaction completes
      mockPrismaRepositoryFindUnique.mockResolvedValue({
        id: mockCreatedRepo.id,
        orgId: mockCreatedRepo.orgId,
        githubId: mockCreatedRepo.githubId,
        name: mockCreatedRepo.name,
        fullName: mockCreatedRepo.fullName,
        description: mockCreatedRepo.description,
        language: mockCreatedRepo.language,
        isPrivate: mockCreatedRepo.isPrivate,
        webhookId: BigInt(mockWebhook.id),
        webhookSecret: 'test-secret',
        syncStatus: 'PENDING' as const,
        lastSyncedAt: null,
        aiReviewEnabled: true,
        sensitivityLevel: 'NORMAL' as const,
        webhookRateLimit: 1000,
        createdAt: mockCreatedRepo.createdAt,
        updatedAt: mockCreatedRepo.updatedAt,
        _count: {
          commits: 0,
          pullRequests: 0,
          issues: 0,
        },
      } as any);
    });

    it('should successfully connect repository with webhook', async () => {
      const result = await repositoriesService.connectRepository(
        mockUserId,
        mockGithubRepoId,
        mockOrgId,
        mockIpAddress
      );

      expect(mockPrismaUserOrganizationFindFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          orgId: mockOrgId,
          role: { in: ['ADMIN', 'MEMBER'] },
        },
      });
      expect(mockPrismaRepositoryFindFirst).toHaveBeenCalledWith({
        where: {
          githubId: BigInt(mockGithubRepoId),
          orgId: mockOrgId,
        },
      });
      expect(mockPrismaTransaction).toHaveBeenCalled();
      expect(mockOctokitInstance.repos.createWebhook).toHaveBeenCalled();
      expect(mockPrismaRepositoryUpdate).toHaveBeenCalledWith({
        where: { id: mockCreatedRepo.id },
        data: { webhookId: BigInt(mockWebhook.id) },
      });
      expect(mockPrismaAuditLogCreate).toHaveBeenCalled();
      expect(mockDeletePattern).toHaveBeenCalledWith(`repos:available:${mockUserId}:*`);
      expect(mockRedisDel).toHaveBeenCalledWith(`repos:connected:${mockOrgId}`);
      expect(result.id).toBe(mockCreatedRepo.id);
    });

    it('should throw error if user does not have access to organization', async () => {
      mockPrismaUserOrganizationFindFirst.mockResolvedValue(null);

      await expect(
        repositoriesService.connectRepository(mockUserId, mockGithubRepoId, mockOrgId, mockIpAddress)
      ).rejects.toThrow('User does not have access to this organization');
    });

    it('should throw error if repository already connected', async () => {
      mockPrismaRepositoryFindFirst.mockResolvedValue({
        id: 'existing-repo',
        githubId: BigInt(mockGithubRepoId),
        orgId: mockOrgId,
        name: 'existing-repo',
        fullName: 'owner/existing-repo',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(
        repositoriesService.connectRepository(mockUserId, mockGithubRepoId, mockOrgId, mockIpAddress)
      ).rejects.toThrow('Repository already connected to this organization');
    });

    it('should throw error if user not found', async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);

      await expect(
        repositoriesService.connectRepository(mockUserId, mockGithubRepoId, mockOrgId, mockIpAddress)
      ).rejects.toThrow('User not found');
    });

    it('should throw error if access token not found', async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        id: mockUserId,
        accessToken: null,
      } as any);

      await expect(
        repositoriesService.connectRepository(mockUserId, mockGithubRepoId, mockOrgId, mockIpAddress)
      ).rejects.toThrow('GitHub access token not found');
    });

    it('should throw error if repository not found on GitHub', async () => {
      mockOctokitInstance.repos.listForAuthenticatedUser.mockResolvedValue({
        data: [], // Repo not in user's repos
      });

      await expect(
        repositoriesService.connectRepository(mockUserId, mockGithubRepoId, mockOrgId, mockIpAddress)
      ).rejects.toThrow('Repository with ID');
    });

    it('should throw error if user does not have admin access', async () => {
      mockOctokitInstance.repos.get.mockResolvedValue({
        data: {
          ...mockGitHubRepo,
          permissions: {
            admin: false,
            push: true,
            pull: true,
          },
        },
      });

      await expect(
        repositoriesService.connectRepository(mockUserId, mockGithubRepoId, mockOrgId, mockIpAddress)
      ).rejects.toThrow('Admin access required');
    });

    it('should create repository even if webhook creation fails', async () => {
      mockOctokitInstance.repos.createWebhook.mockRejectedValue(new Error('Webhook creation failed'));

      const result = await repositoriesService.connectRepository(
        mockUserId,
        mockGithubRepoId,
        mockOrgId,
        mockIpAddress
      );

      expect(mockPrismaRepositoryCreate).toHaveBeenCalled();
      expect(mockPrismaRepositoryUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ webhookId: expect.anything() }),
        })
      );
      expect(result.id).toBe(mockCreatedRepo.id);
    });

    it('should handle GitHub API 404 error', async () => {
      mockOctokitInstance.repos.get.mockRejectedValue({
        status: 404,
        message: 'Not Found',
      });

      await expect(
        repositoriesService.connectRepository(mockUserId, mockGithubRepoId, mockOrgId, mockIpAddress)
      ).rejects.toThrow('Repository not found or no access');
    });

    it('should handle GitHub API 403 error', async () => {
      mockOctokitInstance.repos.get.mockRejectedValue({
        status: 403,
        message: 'Forbidden',
      });

      await expect(
        repositoriesService.connectRepository(mockUserId, mockGithubRepoId, mockOrgId, mockIpAddress)
      ).rejects.toThrow('Access denied to repository');
    });
  });

  describe('disconnectRepository', () => {
    const mockUserId = 'user-123';
    const mockRepoId = 'repo-456';
    const mockOrgId = 'org-789';
    const mockIpAddress = '127.0.0.1';
    const mockRepo = {
      id: mockRepoId,
      orgId: mockOrgId,
      fullName: 'owner/test-repo',
      webhookId: BigInt(456789),
      organization: {
        id: mockOrgId,
        name: 'Test Org',
      },
    };
    const mockUser = {
      id: mockUserId,
      accessToken: 'encrypted_token',
    };
    const mockGitHubToken = 'gho_test_token';

    beforeEach(() => {
      mockPrismaRepositoryFindUnique.mockResolvedValue({
        ...mockRepo,
        githubId: BigInt(123456),
        name: 'test-repo',
        description: null,
        language: 'TypeScript',
        isPrivate: false,
        webhookSecret: 'test-secret',
        syncStatus: 'ACTIVE' as const,
        lastSyncedAt: new Date(),
        aiReviewEnabled: true,
        sensitivityLevel: 'NORMAL' as const,
        webhookRateLimit: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockPrismaUserOrganizationFindFirst.mockResolvedValue({
        userId: mockUserId,
        orgId: mockOrgId,
        role: 'ADMIN',
        joinedAt: new Date(),
      } as any);
      mockPrismaUserFindUnique.mockResolvedValue(mockUser as any);
      mockDecryptGitHubToken.mockReturnValue(mockGitHubToken);
      mockOctokitInstance.repos.deleteWebhook.mockResolvedValue({});
      mockPrismaRepositoryDelete.mockResolvedValue(mockRepo as any);
      mockPrismaAuditLogCreate.mockResolvedValue({
        id: 'audit-123',
        userId: mockUserId,
        orgId: mockOrgId,
        action: 'REPOSITORY_DISCONNECTED',
        resource: `repository:${mockRepoId}`,
        status: 'success',
        createdAt: new Date(),
      } as any);
      mockDeletePattern.mockResolvedValue(1);
      mockRedisDel.mockResolvedValue(1);
    });

    it('should successfully disconnect repository and delete webhook', async () => {
      await repositoriesService.disconnectRepository(mockUserId, mockRepoId, mockIpAddress);

      expect(mockPrismaRepositoryFindUnique).toHaveBeenCalledWith({
        where: { id: mockRepoId },
        include: { organization: true },
      });
      expect(mockPrismaUserOrganizationFindFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          orgId: mockOrgId,
          role: { in: ['ADMIN', 'MEMBER'] },
        },
      });
      expect(mockOctokitInstance.repos.deleteWebhook).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'test-repo',
        hook_id: Number(mockRepo.webhookId),
      });
      expect(mockPrismaRepositoryDelete).toHaveBeenCalledWith({
        where: { id: mockRepoId },
      });
      expect(mockPrismaAuditLogCreate).toHaveBeenCalled();
      expect(mockDeletePattern).toHaveBeenCalledWith(`repos:available:${mockUserId}:*`);
      expect(mockRedisDel).toHaveBeenCalledWith(`repos:connected:${mockOrgId}`);
    });

    it('should throw error if repository not found', async () => {
      mockPrismaRepositoryFindUnique.mockResolvedValue(null);

      await expect(
        repositoriesService.disconnectRepository(mockUserId, mockRepoId, mockIpAddress)
      ).rejects.toThrow('Repository not found');
    });

    it('should throw error if user does not have permission', async () => {
      mockPrismaUserOrganizationFindFirst.mockResolvedValue(null);

      await expect(
        repositoriesService.disconnectRepository(mockUserId, mockRepoId, mockIpAddress)
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should continue even if webhook deletion fails', async () => {
      mockOctokitInstance.repos.deleteWebhook.mockRejectedValue(new Error('Webhook not found'));

      await repositoriesService.disconnectRepository(mockUserId, mockRepoId, mockIpAddress);

      expect(mockPrismaRepositoryDelete).toHaveBeenCalled();
      expect(mockPrismaAuditLogCreate).toHaveBeenCalled();
    });

    it('should continue even if user token not available', async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);

      await repositoriesService.disconnectRepository(mockUserId, mockRepoId, mockIpAddress);

      expect(mockOctokitInstance.repos.deleteWebhook).not.toHaveBeenCalled();
      expect(mockPrismaRepositoryDelete).toHaveBeenCalled();
    });

    it('should skip webhook deletion if webhookId is null', async () => {
      mockPrismaRepositoryFindUnique.mockResolvedValue({
        ...mockRepo,
        githubId: BigInt(123456),
        name: 'test-repo',
        description: null,
        language: 'TypeScript',
        isPrivate: false,
        webhookId: null,
        webhookSecret: 'test-secret',
        syncStatus: 'ACTIVE' as const,
        lastSyncedAt: new Date(),
        aiReviewEnabled: true,
        sensitivityLevel: 'NORMAL' as const,
        webhookRateLimit: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await repositoriesService.disconnectRepository(mockUserId, mockRepoId, mockIpAddress);

      expect(mockOctokitInstance.repos.deleteWebhook).not.toHaveBeenCalled();
      expect(mockPrismaRepositoryDelete).toHaveBeenCalled();
    });
  });

  describe('listConnectedRepositories', () => {
    const mockUserId = 'user-123';
    const mockOrgId = 'org-456';
    const mockRepos = [
      {
        id: 'repo-1',
        orgId: mockOrgId,
        githubId: BigInt(123456),
        name: 'repo1',
        fullName: 'owner/repo1',
        description: 'Test repo 1',
        language: 'TypeScript',
        isPrivate: false,
        webhookId: BigInt(789),
        syncStatus: 'ACTIVE',
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          commits: 10,
          pullRequests: 5,
          issues: 3,
        },
      },
      {
        id: 'repo-2',
        orgId: mockOrgId,
        githubId: BigInt(789012),
        name: 'repo2',
        fullName: 'owner/repo2',
        description: 'Test repo 2',
        language: 'JavaScript',
        isPrivate: true,
        webhookId: null,
        syncStatus: 'PENDING',
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          commits: 0,
          pullRequests: 0,
          issues: 0,
        },
      },
    ];

    beforeEach(() => {
      mockPrismaUserOrganizationFindFirst.mockResolvedValue({
        userId: mockUserId,
        orgId: mockOrgId,
        role: 'MEMBER',
        joinedAt: new Date(),
      } as any);
      mockPrismaRepositoryFindMany.mockResolvedValue(mockRepos as any);
      mockRedisSetex.mockResolvedValue('OK');
    });

    it('should return cached results if available', async () => {
      const cachedResult = mockRepos.map((r) => ({
        id: r.id,
        orgId: r.orgId,
        githubId: r.githubId.toString(),
        name: r.name,
        fullName: r.fullName,
        description: r.description,
        language: r.language,
        isPrivate: r.isPrivate,
        webhookId: r.webhookId?.toString() || null,
        syncStatus: r.syncStatus,
        lastSyncedAt: r.lastSyncedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        stats: {
          commits: r._count.commits,
          pullRequests: r._count.pullRequests,
          issues: r._count.issues,
        },
      }));

      mockRedisGet.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await repositoriesService.listConnectedRepositories(mockOrgId, mockUserId);

      expect(result).toEqual(cachedResult);
      expect(mockRedisGet).toHaveBeenCalledWith(`repos:connected:${mockOrgId}`);
      expect(mockPrismaRepositoryFindMany).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache results', async () => {
      mockRedisGet.mockResolvedValue(null);

      const result = await repositoriesService.listConnectedRepositories(mockOrgId, mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('repo-1');
      expect(result[0].stats.commits).toBe(10);
      expect(result[1].id).toBe('repo-2');
      expect(result[1].webhookId).toBeNull();
      expect(mockPrismaRepositoryFindMany).toHaveBeenCalledWith({
        where: { orgId: mockOrgId },
        include: {
          _count: {
            select: {
              commits: true,
              pullRequests: true,
              issues: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(mockRedisSetex).toHaveBeenCalledWith(
        `repos:connected:${mockOrgId}`,
        600,
        expect.any(String)
      );
    });

    it('should throw error if user does not have access to organization', async () => {
      mockPrismaUserOrganizationFindFirst.mockResolvedValue(null);

      await expect(
        repositoriesService.listConnectedRepositories(mockOrgId, mockUserId)
      ).rejects.toThrow('User does not have access to this organization');
    });
  });

  describe('connectRepositories', () => {
    const mockUserId = 'user-123';
    const mockOrgId = 'org-456';
    const mockIpAddress = '127.0.0.1';
    const mockGithubRepoIds = [123456789, 987654321];

    beforeEach(() => {
      // Mock successful connection for first repo
      mockPrismaUserOrganizationFindFirst.mockResolvedValue({
        userId: mockUserId,
        orgId: mockOrgId,
        role: 'ADMIN',
        joinedAt: new Date(),
      } as any);
      mockPrismaRepositoryFindFirst.mockResolvedValue(null);
      mockPrismaUserFindUnique.mockResolvedValue({
        id: mockUserId,
        accessToken: 'encrypted_token',
      } as any);
      mockDecryptGitHubToken.mockReturnValue('gho_test_token');
      mockOctokitInstance.repos.listForAuthenticatedUser.mockResolvedValue({
        data: [
          {
            id: 123456789,
            name: 'repo1',
            full_name: 'owner/repo1',
            owner: { login: 'owner' },
          },
          {
            id: 987654321,
            name: 'repo2',
            full_name: 'owner/repo2',
            owner: { login: 'owner' },
          },
        ],
      });
      mockOctokitInstance.repos.get.mockResolvedValue({
        data: {
          id: 123456789,
          name: 'repo1',
          full_name: 'owner/repo1',
          description: 'Test repo',
          language: 'TypeScript',
          private: false,
          permissions: { admin: true },
        },
      });
      mockOctokitInstance.repos.createWebhook.mockResolvedValue({
        data: { id: 456789 },
      });
      mockPrismaRepositoryCreate.mockResolvedValue({
        id: 'repo-uuid-1',
        orgId: mockOrgId,
        githubId: BigInt(123456789),
        name: 'repo1',
        fullName: 'owner/repo1',
        webhookSecret: 'test-secret',
        lastSyncedAt: null,
        aiReviewEnabled: true,
        sensitivityLevel: 'NORMAL' as const,
        webhookRateLimit: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { commits: 0, pullRequests: 0, issues: 0 },
      } as any);
      mockPrismaRepositoryUpdate.mockResolvedValue({} as any);
      mockPrismaAuditLogCreate.mockResolvedValue({
        id: 'audit-123',
        userId: mockUserId,
        orgId: mockOrgId,
        action: 'REPOSITORY_CONNECTED',
        resource: 'repository:repo-uuid-1',
        status: 'success',
        createdAt: new Date(),
      } as any);
      (mockPrismaRepositoryFindUnique as any).mockResolvedValue({
        id: 'repo-uuid-1',
        orgId: mockOrgId,
        githubId: BigInt(123456789),
        name: 'repo1',
        fullName: 'owner/repo1',
        description: 'Test repo',
        language: 'TypeScript',
        isPrivate: false,
        webhookId: BigInt(456789),
        webhookSecret: 'test-secret',
        syncStatus: 'PENDING' as const,
        lastSyncedAt: null,
        aiReviewEnabled: true,
        sensitivityLevel: 'NORMAL' as const,
        webhookRateLimit: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { commits: 0, pullRequests: 0, issues: 0 },
      } as any);
      mockPrismaTransaction.mockImplementation(async (callback: any) => {
        const tx = {
          repository: {
            create: mockPrismaRepositoryCreate,
            update: mockPrismaRepositoryUpdate,
          },
          auditLog: {
            create: mockPrismaAuditLogCreate,
          },
        };
        return await callback(tx);
      });
      mockDeletePattern.mockResolvedValue(1);
      mockRedisDel.mockResolvedValue(1);
    });

    it('should successfully connect multiple repositories', async () => {
      // Mock second repo connection
      (mockPrismaRepositoryCreate as any)
        .mockResolvedValueOnce({
          id: 'repo-uuid-1',
          orgId: mockOrgId,
          githubId: BigInt(123456789),
          name: 'repo1',
          fullName: 'owner/repo1',
          webhookSecret: 'test-secret',
          lastSyncedAt: null,
          aiReviewEnabled: true,
          sensitivityLevel: 'NORMAL' as const,
          webhookRateLimit: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { commits: 0, pullRequests: 0, issues: 0 },
        } as any)
        .mockResolvedValueOnce({
          id: 'repo-uuid-2',
          orgId: mockOrgId,
          githubId: BigInt(987654321),
          name: 'repo2',
          fullName: 'owner/repo2',
          webhookSecret: 'test-secret',
          lastSyncedAt: null,
          aiReviewEnabled: true,
          sensitivityLevel: 'NORMAL' as const,
          webhookRateLimit: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { commits: 0, pullRequests: 0, issues: 0 },
        } as any);

      (mockPrismaRepositoryFindUnique as any)
        .mockResolvedValueOnce({
          id: 'repo-uuid-1',
          orgId: mockOrgId,
          githubId: BigInt(123456789),
          name: 'repo1',
          fullName: 'owner/repo1',
          description: 'Test repo',
          language: 'TypeScript',
          isPrivate: false,
          webhookId: BigInt(456789),
          webhookSecret: 'test-secret',
          syncStatus: 'PENDING' as const,
          lastSyncedAt: null,
          aiReviewEnabled: true,
          sensitivityLevel: 'NORMAL' as const,
          webhookRateLimit: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { commits: 0, pullRequests: 0, issues: 0 },
        } as any)
        .mockResolvedValueOnce({
          id: 'repo-uuid-2',
          orgId: mockOrgId,
          githubId: BigInt(987654321),
          name: 'repo2',
          fullName: 'owner/repo2',
          description: 'Test repo 2',
          language: 'JavaScript',
          isPrivate: false,
          webhookId: BigInt(456790),
          webhookSecret: 'test-secret',
          syncStatus: 'PENDING' as const,
          lastSyncedAt: null,
          aiReviewEnabled: true,
          sensitivityLevel: 'NORMAL' as const,
          webhookRateLimit: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { commits: 0, pullRequests: 0, issues: 0 },
        } as any);

      const result = await repositoriesService.connectRepositories(
        mockUserId,
        mockGithubRepoIds,
        mockOrgId,
        mockIpAddress
      );

      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.success[0].githubId).toBe('123456789');
      expect(result.success[1].githubId).toBe('987654321');
    });

    it('should handle partial failures in bulk connection', async () => {
      // First repo succeeds, second fails
      (mockPrismaRepositoryFindFirst as any)
        .mockResolvedValueOnce(null) // First repo not connected
        .mockResolvedValueOnce({
          id: 'existing-repo',
          githubId: BigInt(987654321),
          orgId: mockOrgId,
          name: 'existing-repo',
          fullName: 'owner/existing-repo',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any); // Second repo already connected

      const result = await repositoriesService.connectRepositories(
        mockUserId,
        mockGithubRepoIds,
        mockOrgId,
        mockIpAddress
      );

      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].githubRepoId).toBe(987654321);
      expect(result.failed[0].error).toContain('already connected');
    });

    it('should return empty arrays if all connections fail', async () => {
      (mockPrismaUserOrganizationFindFirst as any).mockResolvedValue(null); // No access

      const result = await repositoriesService.connectRepositories(
        mockUserId,
        mockGithubRepoIds,
        mockOrgId,
        mockIpAddress
      );

      expect(result.success).toHaveLength(0);
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0].error).toContain('access');
      expect(result.failed[1].error).toContain('access');
    });
  });
});

