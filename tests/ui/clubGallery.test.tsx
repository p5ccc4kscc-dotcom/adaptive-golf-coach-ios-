import { fireEvent, render, screen } from '@testing-library/react-native';

import { CLUB_TYPES } from '@/domain/clubCatalog';
import { ClubGallery } from '@/features/clubs/ClubGallery';

describe('Club Face Gallery (native renderer)', () => {
  it('renders one accessible "Add …" tile for every catalogue type', async () => {
    await render(<ClubGallery ownedCounts={new Map()} onSelect={() => undefined} />);
    for (const t of CLUB_TYPES) expect(screen.getByLabelText(`Add ${t.label}`)).toBeTruthy();
  });

  it('selecting a tile reports that type, and owned counts are shown', async () => {
    const onSelect = jest.fn();
    await render(<ClubGallery ownedCounts={new Map([['iron_7', 2]])} onSelect={onSelect} />);
    expect(screen.getByText('Owned × 2')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Add 7-iron'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ code: 'iron_7' }));
  });
});
