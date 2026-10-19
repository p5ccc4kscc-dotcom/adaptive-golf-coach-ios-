import type { useRouter } from 'expo-router';

type AppRouter = ReturnType<typeof useRouter>;

/** Goes back if there is somewhere to go back to (e.g. not after a web deep link), else to `fallback`. */
export function goBackOr(router: AppRouter, fallback: '/clubs' | '/game' | '/today' = '/today') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
