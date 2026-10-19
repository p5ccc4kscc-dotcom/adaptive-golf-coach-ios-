import { fireEvent, render, screen } from '@testing-library/react-native';

import { ChoiceChips, NotAvailable } from '@/ui/components';

describe('accessible controls (native renderer)', () => {
  it('ChoiceChips starts with nothing selected and exposes checked state', async () => {
    const onChange = jest.fn();
    await render(
      <ChoiceChips
        label="Which hand do you play?"
        options={[
          { value: 'right', label: 'Right-handed' },
          { value: 'left', label: 'Left-handed' },
        ]}
        value={null}
        onChange={onChange}
      />,
    );
    const left = screen.getByLabelText('Left-handed');
    expect(left.props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByLabelText('Right-handed').props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(left);
    expect(onChange).toHaveBeenCalledWith('left');
  });

  it('NotAvailable is explicit about unbuilt features', async () => {
    await render(<NotAvailable title="Swing video analysis" detail="Arrives in M1." milestone="M1" />);
    expect(screen.getByText('Not available yet · M1')).toBeTruthy();
  });
});
