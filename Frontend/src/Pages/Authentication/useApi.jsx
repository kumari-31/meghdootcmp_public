// useApi.js
import { useMemo } from 'react';
import { createApiClient } from './apiClient';
import { useAuth } from './authContext';

export function useApi() {
  const { accessToken, setAccessToken } = useAuth();

  const client = useMemo(() => {
    return createApiClient(() => accessToken, (newToken) => setAccessToken(newToken));
  }, [accessToken, setAccessToken]);

  return client;
}
