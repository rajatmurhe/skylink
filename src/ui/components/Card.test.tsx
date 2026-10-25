import { render, screen } from '@testing-library/react';
import { Card } from './Card';
import { describe, it, expect } from 'vitest';

describe('Card Component', () => {
  it('renders children and header text correctly', () => {
    render(
      <Card header="Test Card Header">
        <div>Card Content Body</div>
      </Card>
    );

    expect(screen.getByText('Test Card Header')).toBeInTheDocument();
    expect(screen.getByText('Card Content Body')).toBeInTheDocument();
  });
});
