import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalyseHome } from '@/features/analyse/AnalyseHome';
import { swingAnalysisAvailability } from '@/services/swingAnalysis';

// The unavailable path renders before any data is read, so the services layer is not needed.
jest.mock('@/services/AppServices', () => ({ useServices: jest.fn(), useQuery: jest.fn(() => ({ data: undefined })) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => false, replace: jest.fn() }) }));

/**
 * The Jest native renderer has no GolfVision module, exactly like Expo Go. The
 * Analyse tab must say so and offer nothing that pretends to analyse.
 */
describe('Analyse tab without the native module (iOS renderer)', () => {
  it('reports the module as missing', () => {
    expect(swingAnalysisAvailability()).toEqual({ available: false, reason: 'module_missing' });
  });

  it('explains that this build has no analyser and shows no import button', async () => {
    await render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <AnalyseHome />
      </SafeAreaProvider>,
    );
    expect(screen.getByText(/does not include the swing-analysis module/)).toBeTruthy();
    expect(screen.queryByTestId('import-video')).toBeNull();
  });
});
