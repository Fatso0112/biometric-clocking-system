import { resolveFeatureFlag } from './featureFlagPolicy';

export const ADMIN_HR_PORTALS_ENABLED = resolveFeatureFlag(
  import.meta.env.VITE_ENABLE_ADMIN_HR_PORTALS,
  true,
);

export const MOCK_BIOMETRIC_ENABLED =
  import.meta.env.DEV ||
  resolveFeatureFlag(
    import.meta.env.VITE_ENABLE_MOCK_BIOMETRIC,
    false,
  );
