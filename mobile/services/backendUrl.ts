import Constants from 'expo-constants';

const DEFAULT_BACKEND_PORT = Number(process.env.EXPO_PUBLIC_API_PORT ?? '3001');

function extractHost(rawValue: string | null | undefined): string | null {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const withoutProtocol = trimmed.replace(/^[a-z]+:\/\//i, '');
  const hostAndPort = withoutProtocol.split('/')[0] ?? '';
  const host = hostAndPort.split(':')[0]?.trim();
  return host || null;
}

function getExpoDevHost(): string | null {
  const fromExpoConfig = extractHost(Constants.expoConfig?.hostUri);
  if (fromExpoConfig) {
    return fromExpoConfig;
  }

  const manifest2Host = extractHost(
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })
      .manifest2?.extra?.expoClient?.hostUri,
  );
  if (manifest2Host) {
    return manifest2Host;
  }

  const legacyManifestHost = extractHost(
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost,
  );
  return legacyManifestHost;
}

function buildUrlFromHost(host: string): string {
  return `http://${host}:${DEFAULT_BACKEND_PORT}`;
}

function resolveBackendUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  const envHost = process.env.EXPO_PUBLIC_API_HOST?.trim();
  if (envHost) {
    return buildUrlFromHost(envHost);
  }

  const expoHost = getExpoDevHost();
  if (expoHost) {
    return buildUrlFromHost(expoHost);
  }

  return buildUrlFromHost('localhost');
}

export const BACKEND_URL = resolveBackendUrl();
