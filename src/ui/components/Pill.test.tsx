import { render, screen } from '@testing-library/react';
import { Pill } from './Pill';
import { describe, it, expect } from 'vitest';

describe('Pill Component', () => {
  it('renders state pill with correct label', () => {
    render(<Pill type="good" label="Signal Good" />);

    expect(screen.getByText('Signal Good')).toBeInTheDocument();
  });
});
