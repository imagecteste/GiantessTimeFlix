export interface VideoContent {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl?: string; // Future bunny.net URL
  category: string;
  isSeries: boolean;
  isTrailer?: boolean;
  year: string;
  rating: string;
  genres: string[];
}

export interface Episode {
  id: string;
  kind: 'episode';
  seriesId: string;
  seriesTitle: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  playbackUrl: string;
  publishedAt: string;
  durationInSeconds: number;
  requiresLegacyWarning: boolean;
}

export interface Series {
  id: string;
  kind: 'series';
  title: string;
  description: string;
  thumbnailUrl?: string;
  playbackUrl?: string;
  updatedAt?: string;
  episodeCount: number;
  episodes: Episode[];
}

export interface AuthSession {
  hasFullAccess: boolean;
  isAuthenticated: boolean;
  user: null | {
    email?: string | null;
    fullName?: string | null;
    imageUrl?: string | null;
    patreonUserId: string;
    tierTitles: string[];
  };
}

export interface CatalogResponse {
  access: {
    hasFullAccess: boolean;
    isAuthenticated: boolean;
  };
  featuredSeriesId?: string;
  latestEpisodes: Episode[];
  series: Series[];
  trailers: Series[];
}

export type AppView = 'home' | 'trailers' | 'series' | 'movies';
