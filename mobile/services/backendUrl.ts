import Constants from 'expo-constants';

const DEFAULT_BACKEND_PORT = Number(process.env.EXPO_PUBLIC_API_PORT ?? '3001');
const UNCONFIGURED_BACKEND_URL = 'https://missing-backend.invalid';
type BackendConfigIssue = 'missing_release_url' | 'release_url_must_be_https' | null;

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

function isReleaseBuild(): boolean {
  return !__DEV__ && Constants.executionEnvironment === 'standalone';
}

function isHttpsUrl(url: string): boolean {
  return /^https:\/\//i.test(url);
}

let backendConfigIssue: BackendConfigIssue = null;

function resolveBackendUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    if (isReleaseBuild() && !isHttpsUrl(envUrl)) {
      backendConfigIssue = 'release_url_must_be_https';
      return UNCONFIGURED_BACKEND_URL;
    }
    return envUrl;
  }

  const envHost = process.env.EXPO_PUBLIC_API_HOST?.trim();
  if (envHost) {
    return buildUrlFromHost(envHost);
  }

  if (!isReleaseBuild()) {
    const expoHost = getExpoDevHost();
    if (expoHost) {
      return buildUrlFromHost(expoHost);
    }

    return buildUrlFromHost('localhost');
  }

  backendConfigIssue = 'missing_release_url';
  return UNCONFIGURED_BACKEND_URL;
}

export const BACKEND_URL = resolveBackendUrl();
export const BACKEND_URL_IS_UNCONFIGURED = BACKEND_URL === UNCONFIGURED_BACKEND_URL;

export function getBackendConfigHelpMessage(): string {
  if (backendConfigIssue === 'release_url_must_be_https') {
    return 'En build release, EXPO_PUBLIC_API_URL debe usar HTTPS (ej: https://api.tuapp.com).';
  }
  return 'Backend no configurado en build release. Define EXPO_PUBLIC_API_URL en EAS y vuelve a compilar.';
}
