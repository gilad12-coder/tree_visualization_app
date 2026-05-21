import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Minimal wiring check: proves vitest + @testing-library/react + jsdom
// are all configured correctly. Real component tests should live next to
// the component they exercise, not here.
describe('test harness', () => {
  it('renders DOM nodes', () => {
    render(<h1>Be-net</h1>);
    expect(screen.getByText('Be-net')).toBeInTheDocument();
  });
});
