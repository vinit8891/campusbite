import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SortFilterBar from '@/components/restaurants/SortFilterBar';

describe('SortFilterBar component', () => {
  it('renders all modern sort chips', () => {
    render(<SortFilterBar currentSort="" onSortChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /nearest first/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rating 4\.0\+/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fastest delivery/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cost: low to high/i })).toBeInTheDocument();
  });

  it('renders location quick-badge when userLocationName is provided and triggers callback', async () => {
    const handleLocationClick = vi.fn();
    const user = userEvent.setup();

    render(
      <SortFilterBar
        currentSort=""
        onSortChange={vi.fn()}
        userLocationName="Zeal Campus"
        onLocationClick={handleLocationClick}
      />
    );

    const locationBadge = screen.getByRole('button', { name: /zeal campus/i });
    expect(locationBadge).toBeInTheDocument();

    await user.click(locationBadge);
    expect(handleLocationClick).toHaveBeenCalledTimes(1);
  });

  it('invokes onSortChange with sort option ID when inactive chip is clicked', async () => {
    const handleSortChange = vi.fn();
    const user = userEvent.setup();

    render(<SortFilterBar currentSort="" onSortChange={handleSortChange} />);

    const fastestChip = screen.getByRole('button', { name: /fastest delivery/i });
    await user.click(fastestChip);

    expect(handleSortChange).toHaveBeenCalledWith('fastest');
  });

  it('invokes onSortChange with empty string when active chip is clicked to deselect', async () => {
    const handleSortChange = vi.fn();
    const user = userEvent.setup();

    render(<SortFilterBar currentSort="rating" onSortChange={handleSortChange} />);

    const ratingChip = screen.getByRole('button', { name: /rating 4\.0\+/i });
    await user.click(ratingChip);

    expect(handleSortChange).toHaveBeenCalledWith('');
  });

  it('applies active styling to the currently selected chip', () => {
    render(<SortFilterBar currentSort="distance" onSortChange={vi.fn()} />);

    const distanceChip = screen.getByRole('button', { name: /nearest first/i });
    expect(distanceChip.className).toContain('bg-orange-500');
    expect(distanceChip.className).toContain('text-white');

    const fastestChip = screen.getByRole('button', { name: /fastest delivery/i });
    expect(fastestChip.className).toContain('bg-white');
  });
});
