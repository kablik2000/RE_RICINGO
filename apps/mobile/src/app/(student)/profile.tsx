import { getAppConfig } from '@/core/config';
import { ProfileScreen } from '@/features/profile';

export default function ProfileRoute() {
  return <ProfileScreen config={getAppConfig()} />;
}
