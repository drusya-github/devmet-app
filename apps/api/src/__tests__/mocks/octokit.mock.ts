/**
 * Mock for Octokit client
 */

import { jest } from '@jest/globals';

// Mock Octokit REST API
export const mockOctokit = {
  rest: {
    users: {
      getAuthenticated: jest.fn(),
    },
    repos: {
      get: jest.fn(),
      listForAuthenticatedUser: jest.fn(),
      listCommits: jest.fn(),
    },
    pulls: {
      list: jest.fn(),
      get: jest.fn(),
    },
    issues: {
      list: jest.fn(),
      get: jest.fn(),
      listComments: jest.fn(),
    },
    orgs: {
      listForAuthenticatedUser: jest.fn(),
      listMembers: jest.fn(),
    },
    teams: {
      list: jest.fn(),
    },
  },
  paginate: jest.fn(),
};

// Mock Octokit constructor
export const MockOctokit = jest.fn(() => mockOctokit);

// Export mock helpers
export const resetOctokitMocks = () => {
  Object.values(mockOctokit.rest.users).forEach((fn: any) => fn.mockReset());
  Object.values(mockOctokit.rest.repos).forEach((fn: any) => fn.mockReset());
  Object.values(mockOctokit.rest.pulls).forEach((fn: any) => fn.mockReset());
  Object.values(mockOctokit.rest.issues).forEach((fn: any) => fn.mockReset());
  Object.values(mockOctokit.rest.orgs).forEach((fn: any) => fn.mockReset());
  Object.values(mockOctokit.rest.teams).forEach((fn: any) => fn.mockReset());
  mockOctokit.paginate.mockReset();
};
