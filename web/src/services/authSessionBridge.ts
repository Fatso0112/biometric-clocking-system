type AccessTokenRefresher = () => Promise<string | null>;

let accessTokenRefresher: AccessTokenRefresher | null = null;

export function registerAccessTokenRefresher(
  refresher: AccessTokenRefresher,
): () => void {
  accessTokenRefresher = refresher;

  return () => {
    if (accessTokenRefresher === refresher) {
      accessTokenRefresher = null;
    }
  };
}

export async function requestRefreshedAccessToken(): Promise<string | null> {
  return accessTokenRefresher
    ? accessTokenRefresher()
    : null;
}
