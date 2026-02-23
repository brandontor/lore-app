import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders with default variant', () => {
    render(<Badge variant="default">Default</Badge>);
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('renders with success variant', () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders with warning variant', () => {
    render(<Badge variant="warning">Paused</Badge>);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('renders with danger variant', () => {
    render(<Badge variant="danger">Error</Badge>);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});
