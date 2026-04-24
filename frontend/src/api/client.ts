import axios from 'axios';
import type {
  SquadResponse, ClusterResponse, RegressionAnalytics,
  SimilarResponse, ReplacementsResponse, DistributionAnalytics, DbscanResponse,
} from '../types';

const api = axios.create({ baseURL: '/api' });

export const getTeams = (): Promise<{ teams: string[] }> =>
  api.get('/teams').then(r => r.data);

export const getSquad = (teamName: string): Promise<SquadResponse> =>
  api.get(`/team/${encodeURIComponent(teamName)}/squad`).then(r => r.data);

export const getTeamClusters = (teamName: string): Promise<ClusterResponse> =>
  api.get(`/team/${encodeURIComponent(teamName)}/clusters`).then(r => r.data);

export const getSimilarPlayers = (playerName: string, k = 10): Promise<SimilarResponse> =>
  api.get(`/player/${encodeURIComponent(playerName)}/similar`, { params: { k } }).then(r => r.data);

export const getBudgetReplacements = (teamName: string, budget: number): Promise<ReplacementsResponse> =>
  api.get(`/team/${encodeURIComponent(teamName)}/replacements`, { params: { budget } }).then(r => r.data);

export const getRegressionAnalytics = (): Promise<RegressionAnalytics> =>
  api.get('/analytics/regression').then(r => r.data);

export const getDistribution = (): Promise<DistributionAnalytics> =>
  api.get('/analytics/distribution').then(r => r.data);

export const getDbscanClusters = (): Promise<DbscanResponse> =>
  api.get('/analytics/dbscan').then(r => r.data);
