import assert from 'node:assert';
import crypto from 'node:crypto';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import express, {type NextFunction, type Request, type Response} from 'express';
import dotenv from 'dotenv';

export const app = express();

const BUNNY_API_BASE_URL = 'https://video.bunnycdn.com';
const BUNNY_EMBED_BASE_URL = 'https://player.mediadelivery.net/embed';
const PATREON_API_BASE_URL = 'https://www.patreon.com/api/oauth2/v2';
const PATREON_OAUTH_AUTHORIZE_URL = 'https://www.patreon.com/oauth2/authorize';
const PATREON_OAUTH_TOKEN_URL = 'https://www.patreon.com/api/oauth2/token';
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_SERVER_PORT = 8787;
const OAUTH_STATE_COOKIE_NAME = 'gtf_patreon_oauth_state';
const SESSION_COOKIE_NAME = 'gtf_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const STATE_TTL_MS = 1000 * 60 * 10;
const PATREON_SCOPES = ['identity', 'identity.memberships', 'identity[email]'];

const envFileCandidates = ['.env.local', '.env'];
for (const envFileName of envFileCandidates) {
  const envFilePath = path.resolve(process.cwd(), envFileName);
  if (existsSync(envFilePath)) {
    dotenv.config({path: envFilePath});
    break;
  }
}

interface BunnyPaginationResponse<TItem> {
  currentPage: number;
  items: TItem[] | null;
  itemsPerPage: number;
  totalItems: number;
}

interface BunnyCollection {
  guid: string | null;
  name: string | null;
  previewImageUrls?: string[] | null;
  videoCount: number;
}

interface BunnyVideo {
  collectionId?: string | null;
  dateUploaded: string;
  description?: string | null;
  guid: string;
  length: number;
  thumbnailFileName?: string | null;
  title: string;
}

interface EpisodeResponse {
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

interface SeriesResponse {
  id: string;
  kind: 'series';
  title: string;
  description: string;
  thumbnailUrl?: string;
  playbackUrl?: string;
  updatedAt?: string;
  episodeCount: number;
  episodes: EpisodeResponse[];
}

interface CatalogResponse {
  access: {
    hasFullAccess: boolean;
    isAuthenticated: boolean;
  };
  featuredSeriesId?: string;
  latestEpisodes: EpisodeResponse[];
  series: SeriesResponse[];
  trailers: SeriesResponse[];
}

interface PatreonCampaignResponse {
  data: {
    id: string;
    type: 'campaign';
  }[];
  included?: PatreonTier[];
}

interface PatreonTier {
  id: string;
  type: 'tier';
  attributes?: {
    amount_cents?: number | null;
    title?: string | null;
  };
}

interface PatreonIdentityResponse {
  data: {
    id: string;
    type: 'user';
    attributes?: {
      email?: string | null;
      full_name?: string | null;
      image_url?: string | null;
      is_email_verified?: boolean | null;
    };
    relationships?: {
      memberships?: {
        data?: Array<{
          id: string;
          type: 'member';
        }>;
      };
    };
  };
  included?: Array<PatreonMember | PatreonTier | PatreonCampaign>;
}

interface PatreonCampaign {
  id: string;
  type: 'campaign';
}

interface PatreonMember {
  id: string;
  type: 'member';
  attributes?: {
    patron_status?: string | null;
  };
  relationships?: {
    campaign?: {
      data?: {
        id: string;
        type: 'campaign';
      } | null;
    };
    currently_entitled_tiers?: {
      data?: Array<{
        id: string;
        type: 'tier';
      }>;
    };
  };
}

interface PatreonTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: 'Bearer';
}

interface AuthSessionResponse {
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

type CookieSameSiteValue = 'Lax' | 'None' | 'Strict';

interface SignedCookieEnvelope<TValue> {
  expiresAt: number;
  value: TValue;
}

interface SignedOAuthState {
  purpose: 'oauth-state';
  state: string;
}

interface SignedAuthSession {
  purpose: 'auth-session';
  session: AuthSessionResponse;
}

function readRequiredEnv(variableName: string): string {
  const variableValue = process.env[variableName]?.trim();
  assert(variableValue, `Missing required environment variable: ${variableName}`);
  return variableValue;
}

function readIntegerEnv(variableName: string, fallbackValue: number): number {
  const rawVariableValue = process.env[variableName]?.trim();
  if (!rawVariableValue) {
    return fallbackValue;
  }

  const parsedValue = Number.parseInt(rawVariableValue, 10);
  assert(Number.isInteger(parsedValue), `Invalid integer value for ${variableName}`);
  return parsedValue;
}

function readOptionalEnvList(variableName: string): string[] {
  const rawVariableValue = process.env[variableName]?.trim();
  if (!rawVariableValue) {
    return [];
  }

  return rawVariableValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function readBooleanEnv(variableName: string, fallbackValue: boolean): boolean {
  const rawVariableValue = process.env[variableName]?.trim().toLowerCase();
  if (!rawVariableValue) {
    return fallbackValue;
  }

  if (['1', 'true', 'yes'].includes(rawVariableValue)) {
    return true;
  }

  if (['0', 'false', 'no'].includes(rawVariableValue)) {
    return false;
  }

  assert(false, `Invalid boolean value for ${variableName}`);
}

function normalizeUrlOrigin(rawUrl: string): string {
  return new URL(rawUrl).origin;
}

function readCookieSameSiteEnv(
  variableName: string,
  fallbackValue: CookieSameSiteValue,
): CookieSameSiteValue {
  const rawVariableValue = process.env[variableName]?.trim().toLowerCase();
  if (!rawVariableValue) {
    return fallbackValue;
  }

  if (rawVariableValue === 'lax') {
    return 'Lax';
  }

  if (rawVariableValue === 'none') {
    return 'None';
  }

  if (rawVariableValue === 'strict') {
    return 'Strict';
  }

  assert(false, `Invalid SameSite value for ${variableName}`);
}

const bunnyLibraryId = readRequiredEnv('BUNNY_LIBRARY_ID');
const bunnyStreamAccessKey = readRequiredEnv('BUNNY_STREAM_ACCESS_KEY');
const serverPort = readIntegerEnv('PORT', DEFAULT_SERVER_PORT);
const patreonClientId = process.env.PATREON_CLIENT_ID?.trim() || '';
const patreonClientSecret = process.env.PATREON_CLIENT_SECRET?.trim() || '';
const patreonCreatorAccessToken = process.env.PATREON_CREATOR_ACCESS_TOKEN?.trim() || '';
const patreonRedirectUri =
  process.env.PATREON_REDIRECT_URI?.trim() || 'http://localhost:3000/api/auth/patreon/callback';
const frontendBaseUrl = process.env.FRONTEND_BASE_URL?.trim() || 'http://localhost:3000';
const sessionSigningSecret =
  process.env.SESSION_SIGNING_SECRET?.trim() || patreonClientSecret || 'local-development-session-secret';
const frontendAllowedOrigins = new Set(
  [frontendBaseUrl, ...readOptionalEnvList('FRONTEND_ALLOWED_ORIGINS')].map(normalizeUrlOrigin),
);
const secureCookiesEnabled = readBooleanEnv('COOKIE_SECURE', frontendBaseUrl.startsWith('https://'));
const sessionCookieSameSite = readCookieSameSiteEnv(
  'COOKIE_SAME_SITE',
  secureCookiesEnabled ? 'None' : 'Lax',
);

assert(
  sessionCookieSameSite !== 'None' || secureCookiesEnabled,
  'COOKIE_SAME_SITE=None requires COOKIE_SECURE=true.',
);

let cachedPatreonAccessConfig:
  | {
      campaignId: string;
      highestTierIds: string[];
      loadedAt: number;
    }
  | null = null;

function buildFrontendRedirectUrl(authStatus: string): string {
  const redirectUrl = new URL(frontendBaseUrl);
  redirectUrl.searchParams.set('auth', authStatus);
  return redirectUrl.toString();
}

app.use((request: Request, response: Response, next: NextFunction) => {
  const requestOrigin = request.headers.origin;

  if (requestOrigin && frontendAllowedOrigins.has(requestOrigin)) {
    response.setHeader('Access-Control-Allow-Origin', requestOrigin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Vary', 'Origin');
  }

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  next();
});

function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader.split(';').map((cookiePart) => {
      const [cookieName, ...cookieValueParts] = cookiePart.trim().split('=');
      return [cookieName, decodeURIComponent(cookieValueParts.join('='))];
    }),
  );
}

function setCookie(
  response: Response,
  cookieName: string,
  cookieValue: string,
  options?: {
    httpOnly?: boolean;
    maxAgeSeconds?: number;
  },
): void {
  const cookieParts = [
    `${cookieName}=${encodeURIComponent(cookieValue)}`,
    'Path=/',
    `SameSite=${sessionCookieSameSite}`,
  ];

  if (options?.httpOnly !== false) {
    cookieParts.push('HttpOnly');
  }

  if (secureCookiesEnabled) {
    cookieParts.push('Secure');
  }

  if (options?.maxAgeSeconds) {
    cookieParts.push(`Max-Age=${options.maxAgeSeconds}`);
  }

  response.append('Set-Cookie', cookieParts.join('; '));
}

function clearCookie(response: Response, cookieName: string): void {
  const cookieParts = [
    `${cookieName}=`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sessionCookieSameSite}`,
    'Max-Age=0',
  ];

  if (secureCookiesEnabled) {
    cookieParts.push('Secure');
  }

  response.append('Set-Cookie', cookieParts.join('; '));
}

function createRandomToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signCookiePayload(encodedPayload: string): string {
  return crypto.createHmac('sha256', sessionSigningSecret).update(encodedPayload).digest('base64url');
}

function encodeSignedCookieValue<TValue>(value: TValue, ttlInMs: number): string {
  const encodedPayload = encodeBase64Url(
    JSON.stringify({
      expiresAt: Date.now() + ttlInMs,
      value,
    } satisfies SignedCookieEnvelope<TValue>),
  );

  return `${encodedPayload}.${signCookiePayload(encodedPayload)}`;
}

function decodeSignedCookieValue<TValue>(signedCookieValue?: string): TValue | null {
  if (!signedCookieValue) {
    return null;
  }

  const [encodedPayload, providedSignature, ...remainingParts] = signedCookieValue.split('.');
  if (!encodedPayload || !providedSignature || remainingParts.length > 0) {
    return null;
  }

  const expectedSignature = signCookiePayload(encodedPayload);
  let providedSignatureBuffer: Buffer;
  let expectedSignatureBuffer: Buffer;

  try {
    providedSignatureBuffer = Buffer.from(providedSignature, 'base64url');
    expectedSignatureBuffer = Buffer.from(expectedSignature, 'base64url');
  } catch {
    return null;
  }

  if (
    providedSignatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(decodeBase64Url(encodedPayload)) as SignedCookieEnvelope<TValue>;
    if (
      typeof parsedPayload.expiresAt !== 'number' ||
      !Number.isFinite(parsedPayload.expiresAt) ||
      parsedPayload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return parsedPayload.value;
  } catch {
    return null;
  }
}

function encodeOAuthStateCookieValue(state: string): string {
  return encodeSignedCookieValue<SignedOAuthState>(
    {
      purpose: 'oauth-state',
      state,
    },
    STATE_TTL_MS,
  );
}

function readOAuthStateFromCookie(signedCookieValue?: string): string | null {
  const parsedValue = decodeSignedCookieValue<SignedOAuthState>(signedCookieValue);
  if (!parsedValue || parsedValue.purpose !== 'oauth-state') {
    return null;
  }

  return parsedValue.state;
}

function encodeAuthSessionCookieValue(authSession: AuthSessionResponse): string {
  return encodeSignedCookieValue<SignedAuthSession>(
    {
      purpose: 'auth-session',
      session: authSession,
    },
    SESSION_TTL_MS,
  );
}

function readAuthSessionFromCookie(signedCookieValue?: string): AuthSessionResponse | null {
  const parsedValue = decodeSignedCookieValue<SignedAuthSession>(signedCookieValue);
  if (!parsedValue || parsedValue.purpose !== 'auth-session') {
    return null;
  }

  return parsedValue.session;
}

function isPatreonAuthConfigured(): boolean {
  return Boolean(patreonClientId && patreonClientSecret && patreonCreatorAccessToken);
}

function buildPatreonAuthorizeUrl(state: string): string {
  const authorizeUrl = new URL(PATREON_OAUTH_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', patreonClientId);
  authorizeUrl.searchParams.set('redirect_uri', patreonRedirectUri);
  authorizeUrl.searchParams.set('scope', PATREON_SCOPES.join(' '));
  authorizeUrl.searchParams.set('state', state);
  return authorizeUrl.toString();
}

async function fetchPatreonCreatorJson<TResponse>(pathName: string): Promise<TResponse> {
  const response = await fetch(`${PATREON_API_BASE_URL}${pathName}`, {
    headers: {
      Authorization: `Bearer ${patreonCreatorAccessToken}`,
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Patreon creator request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as TResponse;
}

async function exchangePatreonCodeForToken(code: string): Promise<PatreonTokenResponse> {
  const requestBody = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: patreonClientId,
    client_secret: patreonClientSecret,
    redirect_uri: patreonRedirectUri,
  });

  const response = await fetch(PATREON_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body: requestBody,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Patreon token exchange failed: ${response.status} ${errorBody}`);
  }

  return (await response.json()) as PatreonTokenResponse;
}

async function fetchPatreonIdentity(accessToken: string): Promise<PatreonIdentityResponse> {
  const requestUrl = new URL(`${PATREON_API_BASE_URL}/identity`);
  requestUrl.searchParams.set(
    'include',
    'memberships.currently_entitled_tiers,memberships.campaign',
  );
  requestUrl.searchParams.set(
    'fields[user]',
    'full_name,email,image_url,is_email_verified',
  );
  requestUrl.searchParams.set('fields[member]', 'patron_status');
  requestUrl.searchParams.set('fields[tier]', 'title,amount_cents');

  const response = await fetch(requestUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Patreon identity request failed: ${response.status} ${errorBody}`);
  }

  return (await response.json()) as PatreonIdentityResponse;
}

async function getPatreonAccessConfig(): Promise<{
  campaignId: string;
  highestTierIds: string[];
}> {
  const cacheIsFresh =
    cachedPatreonAccessConfig !== null &&
    cachedPatreonAccessConfig.loadedAt + 1000 * 60 * 10 > Date.now();
  if (cacheIsFresh) {
    const cachedAccessConfig = cachedPatreonAccessConfig;
    assert(cachedAccessConfig, 'Patreon access config cache is unexpectedly empty.');
    return {
      campaignId: cachedAccessConfig.campaignId,
      highestTierIds: cachedAccessConfig.highestTierIds,
    };
  }

  const campaignResponse = await fetchPatreonCreatorJson<PatreonCampaignResponse>(
    '/campaigns?include=tiers&fields[tier]=title,amount_cents',
  );
  const firstCampaign = campaignResponse.data[0];
  assert(firstCampaign, 'No Patreon campaign was returned for the creator token.');

  const highestTierIds = (campaignResponse.included ?? [])
    .filter((includedItem): includedItem is PatreonTier => includedItem.type === 'tier')
    .sort(
      (leftTier, rightTier) =>
        (rightTier.attributes?.amount_cents ?? 0) - (leftTier.attributes?.amount_cents ?? 0),
    )
    .slice(0, 2)
    .map((tier) => tier.id);

  cachedPatreonAccessConfig = {
    campaignId: firstCampaign.id,
    highestTierIds,
    loadedAt: Date.now(),
  };

  return {
    campaignId: firstCampaign.id,
    highestTierIds,
  };
}

async function buildAuthSessionFromPatreonCode(code: string): Promise<AuthSessionResponse> {
  const tokenResponse = await exchangePatreonCodeForToken(code);
  const identityResponse = await fetchPatreonIdentity(tokenResponse.access_token);
  const accessConfig = await getPatreonAccessConfig();

  const memberships = (identityResponse.included ?? []).filter(
    (includedItem): includedItem is PatreonMember => includedItem.type === 'member',
  );
  const tiers = new Map(
    (identityResponse.included ?? [])
      .filter((includedItem): includedItem is PatreonTier => includedItem.type === 'tier')
      .map((tier) => [tier.id, tier]),
  );

  const matchingMembership = memberships.find(
    (membership) =>
      membership.relationships?.campaign?.data?.id === accessConfig.campaignId &&
      membership.attributes?.patron_status === 'active_patron',
  );

  const entitledTierIds =
    matchingMembership?.relationships?.currently_entitled_tiers?.data?.map((tier) => tier.id) ?? [];
  const hasFullAccess = entitledTierIds.some((tierId) =>
    accessConfig.highestTierIds.includes(tierId),
  );

  return {
    hasFullAccess,
    isAuthenticated: true,
    user: {
      email: identityResponse.data.attributes?.email ?? null,
      fullName: identityResponse.data.attributes?.full_name ?? null,
      imageUrl: identityResponse.data.attributes?.image_url ?? null,
      patreonUserId: identityResponse.data.id,
      tierTitles: entitledTierIds
        .map((tierId) => tiers.get(tierId)?.attributes?.title ?? null)
        .filter((title): title is string => Boolean(title)),
    },
  };
}

function readAuthSessionFromRequest(request: Request): AuthSessionResponse {
  const cookies = parseCookies(request);
  const authSession = readAuthSessionFromCookie(cookies[SESSION_COOKIE_NAME]);
  if (!authSession) {
    return {
      hasFullAccess: false,
      isAuthenticated: false,
      user: null,
    };
  }

  return authSession;
}

function buildBunnyEmbedUrl(videoId: string): string {
  return `${BUNNY_EMBED_BASE_URL}/${bunnyLibraryId}/${videoId}`;
}

async function fetchBunnyJson<TResponse>(
  pathName: string,
  searchParameters: Record<string, string>,
): Promise<TResponse> {
  const requestUrl = new URL(`${BUNNY_API_BASE_URL}${pathName}`);
  for (const [parameterName, parameterValue] of Object.entries(searchParameters)) {
    requestUrl.searchParams.set(parameterName, parameterValue);
  }

  const response = await fetch(requestUrl, {
    headers: {
      AccessKey: bunnyStreamAccessKey,
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Bunny API request failed for ${requestUrl.pathname}: ${response.status} ${response.statusText} - ${errorBody}`,
    );
  }

  return (await response.json()) as TResponse;
}

async function fetchAllPages<TItem>(
  pathName: string,
  baseSearchParameters: Record<string, string>,
): Promise<TItem[]> {
  const collectedItems: TItem[] = [];
  let currentPage = 1;
  let totalItems = Number.POSITIVE_INFINITY;

  while (collectedItems.length < totalItems) {
    const pageResponse = await fetchBunnyJson<BunnyPaginationResponse<TItem>>(pathName, {
      ...baseSearchParameters,
      itemsPerPage: String(DEFAULT_PAGE_SIZE),
      page: String(currentPage),
    });

    const responseItems = pageResponse.items ?? [];
    collectedItems.push(...responseItems);
    totalItems = pageResponse.totalItems;
    currentPage += 1;

    if (responseItems.length === 0) {
      break;
    }
  }

  return collectedItems;
}

async function fetchCollections(): Promise<BunnyCollection[]> {
  return fetchAllPages<BunnyCollection>(`/library/${bunnyLibraryId}/collections`, {
    includeThumbnails: 'true',
    orderBy: 'date',
  });
}

async function fetchVideosForCollection(collectionId: string): Promise<BunnyVideo[]> {
  return fetchAllPages<BunnyVideo>(`/library/${bunnyLibraryId}/videos`, {
    collection: collectionId,
    orderBy: 'date',
  });
}

function buildSeriesDescription(episodes: EpisodeResponse[], collectionTitle: string): string {
  const firstEpisodeWithDescription = episodes.find((episode) => episode.description.length > 0);
  if (firstEpisodeWithDescription) {
    return firstEpisodeWithDescription.description;
  }

  return `Episodes from ${collectionTitle}`;
}

function sanitizeBunnyTitle(title: string): string {
  return title.trim().replace(/\.mp4$/i, '');
}

function extractEpisodeNumber(title: string): number | null {
  const episodeMatch = sanitizeBunnyTitle(title).match(/#\s*(\d+)/i);
  if (!episodeMatch) {
    return null;
  }

  const parsedEpisodeNumber = Number.parseInt(episodeMatch[1], 10);
  return Number.isInteger(parsedEpisodeNumber) ? parsedEpisodeNumber : null;
}

function buildEpisodeDisplayTitle(title: string, isTrailerCollection: boolean): string {
  const episodeNumber = extractEpisodeNumber(title);
  if (episodeNumber === null) {
    return sanitizeBunnyTitle(title) || 'Untitled Episode';
  }

  if (isTrailerCollection) {
    return `Episode ${episodeNumber} - Trailer`;
  }

  return `Episode ${episodeNumber}`;
}

function ensureTrailerEpisodeTitle(title: string): string {
  if (/\s-\sTrailer$/i.test(title)) {
    return title;
  }

  return `${title} - Trailer`;
}

function compareVideosByEpisodeNumber(leftVideo: BunnyVideo, rightVideo: BunnyVideo): number {
  const leftEpisodeNumber = extractEpisodeNumber(leftVideo.title);
  const rightEpisodeNumber = extractEpisodeNumber(rightVideo.title);

  if (leftEpisodeNumber !== null && rightEpisodeNumber !== null) {
    return leftEpisodeNumber - rightEpisodeNumber;
  }

  if (leftEpisodeNumber !== null) {
    return -1;
  }

  if (rightEpisodeNumber !== null) {
    return 1;
  }

  return (
    new Date(leftVideo.dateUploaded).getTime() - new Date(rightVideo.dateUploaded).getTime()
  );
}

function requiresLegacyWarning(title: string): boolean {
  return /#ant/i.test(sanitizeBunnyTitle(title));
}

function isTrailerCollectionName(collectionName: string): boolean {
  return /\s-\sTrailers\s*$/i.test(collectionName.trim());
}

function sanitizeCollectionTitle(collectionName: string): string {
  if (!isTrailerCollectionName(collectionName)) {
    return collectionName;
  }

  return collectionName.replace(/\s-\sTrailers\s*$/i, '').trim();
}

function extractCdnHostname(thumbnailUrl?: string): string | null {
  if (!thumbnailUrl) {
    return null;
  }

  try {
    return new URL(thumbnailUrl).host;
  } catch {
    return null;
  }
}

function buildEpisodeThumbnailUrl(
  cdnHostname: string | null,
  videoId: string,
  thumbnailFileName?: string | null,
): string | undefined {
  if (!cdnHostname || !thumbnailFileName) {
    return undefined;
  }

  return `https://${cdnHostname}/${videoId}/${thumbnailFileName}`;
}

function mapVideoToEpisode(
  video: BunnyVideo,
  collection: BunnyCollection,
  isTrailerCollection: boolean,
  collectionCdnHostname: string | null,
  collectionThumbnailUrl?: string,
): EpisodeResponse {
  const collectionId = collection.guid ?? 'unknown-series';
  const rawCollectionTitle = collection.name?.trim() || 'Untitled Series';
  const collectionTitle = sanitizeCollectionTitle(rawCollectionTitle);
  const episodeThumbnailUrl =
    buildEpisodeThumbnailUrl(collectionCdnHostname, video.guid, video.thumbnailFileName) ??
    collectionThumbnailUrl;

  return {
    id: video.guid,
    kind: 'episode',
    seriesId: collectionId,
    seriesTitle: collectionTitle,
    title: buildEpisodeDisplayTitle(video.title, isTrailerCollection),
    description: video.description?.trim() || '',
    thumbnailUrl: episodeThumbnailUrl,
    playbackUrl: buildBunnyEmbedUrl(video.guid),
    publishedAt: video.dateUploaded,
    durationInSeconds: video.length,
    requiresLegacyWarning: requiresLegacyWarning(video.title),
  };
}

function mapCollectionToSeries(
  collection: BunnyCollection,
  videos: BunnyVideo[],
): SeriesResponse | null {
  const collectionId = collection.guid?.trim();
  if (!collectionId) {
    return null;
  }

  const rawCollectionTitle = collection.name?.trim() || 'Untitled Series';
  const isTrailerCollection = isTrailerCollectionName(rawCollectionTitle);
  const collectionTitle = sanitizeCollectionTitle(rawCollectionTitle);
  const collectionThumbnailUrl = collection.previewImageUrls?.find(Boolean) || undefined;
  const collectionCdnHostname = extractCdnHostname(collectionThumbnailUrl);
  const sortedVideos = [...videos].sort(compareVideosByEpisodeNumber);
  const episodes = sortedVideos.map((video) =>
    mapVideoToEpisode(
      video,
      collection,
      isTrailerCollection,
      collectionCdnHostname,
      collectionThumbnailUrl,
    ),
  );
  const firstEpisode = episodes[0];
  const lastEpisode = episodes.at(-1);

  return {
    id: collectionId,
    kind: 'series',
    title: collectionTitle,
    description: buildSeriesDescription(episodes, collectionTitle),
    thumbnailUrl: lastEpisode?.thumbnailUrl ?? collectionThumbnailUrl,
    playbackUrl: firstEpisode?.playbackUrl,
    updatedAt: lastEpisode?.publishedAt,
    episodeCount: episodes.length,
    episodes,
  };
}

function decorateTrailerSeries(series: SeriesResponse): SeriesResponse {
  return {
    ...series,
    episodes: series.episodes.map((episode) => ({
      ...episode,
      title: ensureTrailerEpisodeTitle(episode.title),
    })),
  };
}

async function buildCatalogResponse(authSession: AuthSessionResponse): Promise<CatalogResponse> {
  const collections = await fetchCollections();

  const allCollections = (
    await Promise.all(
      collections.map(async (collection) => {
        const collectionId = collection.guid?.trim();
        if (!collectionId) {
          return null;
        }

        const collectionVideos = await fetchVideosForCollection(collectionId);
        return mapCollectionToSeries(collection, collectionVideos);
      }),
    )
  ).filter((series): series is SeriesResponse => series !== null);

  const sortedCollections = allCollections.sort((leftSeries, rightSeries) => {
    const leftTimestamp = leftSeries.updatedAt ? new Date(leftSeries.updatedAt).getTime() : 0;
    const rightTimestamp = rightSeries.updatedAt ? new Date(rightSeries.updatedAt).getTime() : 0;
    return rightTimestamp - leftTimestamp;
  });

  const sortedSeries = sortedCollections.filter(
    (series) => !isTrailerCollectionName(collections.find((collection) => collection.guid === series.id)?.name?.trim() || ''),
  );
  const sortedTrailers = sortedCollections
    .filter((series) =>
      isTrailerCollectionName(collections.find((collection) => collection.guid === series.id)?.name?.trim() || ''),
    )
    .map(decorateTrailerSeries);

  const latestEpisodes = [...sortedSeries, ...sortedTrailers]
    .flatMap((series) => series.episodes)
    .sort(
      (leftEpisode, rightEpisode) =>
        new Date(rightEpisode.publishedAt).getTime() -
        new Date(leftEpisode.publishedAt).getTime(),
    )
    .slice(0, 12);

  return {
    access: {
      hasFullAccess: authSession.hasFullAccess,
      isAuthenticated: authSession.isAuthenticated,
    },
    featuredSeriesId: sortedSeries[0]?.id,
    latestEpisodes,
    series: sortedSeries,
    trailers: sortedTrailers,
  };
}

app.get('/api/auth/session', (request: Request, response: Response) => {
  response.json(readAuthSessionFromRequest(request));
});

app.get('/api/auth/patreon/login', (_request: Request, response: Response) => {
  if (!isPatreonAuthConfigured()) {
    response.status(500).json({
      error:
        'Patreon authentication is not configured. Set PATREON_CLIENT_ID, PATREON_CLIENT_SECRET and PATREON_CREATOR_ACCESS_TOKEN.',
    });
    return;
  }

  const state = createRandomToken();
  setCookie(response, OAUTH_STATE_COOKIE_NAME, encodeOAuthStateCookieValue(state), {
    maxAgeSeconds: Math.floor(STATE_TTL_MS / 1000),
  });
  response.redirect(buildPatreonAuthorizeUrl(state));
});

app.get('/api/auth/patreon/callback', async (request: Request, response: Response) => {
  try {
    if (!isPatreonAuthConfigured()) {
      response.redirect(buildFrontendRedirectUrl('missing_config'));
      return;
    }

    const cookies = parseCookies(request);
    const returnedState = typeof request.query.state === 'string' ? request.query.state : '';
    const storedStateCookie = readOAuthStateFromCookie(cookies[OAUTH_STATE_COOKIE_NAME]);
    const authorizationCode = typeof request.query.code === 'string' ? request.query.code : '';

    if (!authorizationCode || !returnedState || returnedState !== storedStateCookie) {
      response.redirect(buildFrontendRedirectUrl('invalid_state'));
      return;
    }

    clearCookie(response, OAUTH_STATE_COOKIE_NAME);

    const authSession = await buildAuthSessionFromPatreonCode(authorizationCode);
    setCookie(response, SESSION_COOKIE_NAME, encodeAuthSessionCookieValue(authSession), {
      maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000),
    });

    response.redirect(buildFrontendRedirectUrl('success'));
  } catch (error) {
    console.error('Patreon OAuth callback failed', error);
    response.redirect(buildFrontendRedirectUrl('error'));
  }
});

app.post('/api/auth/logout', (_request: Request, response: Response) => {
  clearCookie(response, SESSION_COOKIE_NAME);
  response.json({
    hasFullAccess: false,
    isAuthenticated: false,
    user: null,
  } satisfies AuthSessionResponse);
});

app.get('/api/health', (_request: Request, response: Response) => {
  response.json({ok: true});
});

app.get('/api/series', async (request: Request, response: Response) => {
  try {
    const catalogResponse = await buildCatalogResponse(readAuthSessionFromRequest(request));
    response.json(catalogResponse);
  } catch (error) {
    console.error('Failed to build Bunny catalog', error);
    response.status(500).json({
      error: 'Failed to load Bunny catalog.',
    });
  }
});

const executedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentFilePath = fileURLToPath(import.meta.url);

if (executedFilePath === currentFilePath) {
  app.listen(serverPort, () => {
    console.log(`Bunny proxy listening on http://localhost:${serverPort}`);
  });
}
