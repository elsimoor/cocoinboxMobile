import { useAuth } from '@/context/AuthContext';

export function useIsPro() {
  const { user } = useAuth();
  const isPro = !!(user?.is_pro || user?.roles?.includes('pro'));
  const proGraceUntil = user?.proGraceUntil ? new Date(user.proGraceUntil) : null;
  const now = new Date();
  const inGraceAfterDowngrade = !isPro && proGraceUntil !== null && proGraceUntil.getTime() > now.getTime();
  return { isPro, proGraceUntil, inGraceAfterDowngrade };
}
