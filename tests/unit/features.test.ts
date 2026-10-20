import { FEATURES, featureBadge, featuresByStatus } from '@/domain/features';

describe('feature status registry', () => {
  it('never lists unbuilt features as available', () => {
    const planned = featuresByStatus('planned').map((f) => f.id);
    expect(planned).toEqual(expect.arrayContaining(['swing_analysis', 'coaching', 'rounds', 'backup']));
    expect(featuresByStatus('available').map((f) => f.id)).not.toEqual(expect.arrayContaining(['swing_analysis']));
  });
  it('labels planned features with their milestone', () => {
    expect(featureBadge(FEATURES.find((f) => f.id === 'swing_analysis')!)).toBe('Planned · M1');
    expect(featureBadge(FEATURES.find((f) => f.id === 'clubs')!)).toBe('Available');
  });
  it('has unique ids', () => {
    expect(new Set(FEATURES.map((f) => f.id)).size).toBe(FEATURES.length);
  });
});
