import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CVTimelineSection from './CVTimelineSection';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => key,
    i18n: { language: 'en' },
  }),
}));

const renderTimeline = personId => render(
  <CVTimelineSection
    node={{ person_id: personId, hierarchical_structure: '/1' }}
    folderId={1}
    tableId={1}
    onBack={() => {}}
  />
);

describe('CVTimelineSection', () => {
  it('offers only the structural timeline for a vacant position', () => {
    renderTimeline(null);

    expect(screen.queryByText('cvTimeline.queryPersonalInfo')).not.toBeInTheDocument();
    expect(screen.getByText('cvTimeline.queryHierarchicalInfo')).toBeInTheDocument();
  });

  it('offers the personal timeline when a person ID is available', () => {
    renderTimeline('EMP-001');

    expect(screen.getByText('cvTimeline.queryPersonalInfo')).toBeInTheDocument();
    expect(screen.getByText('cvTimeline.queryHierarchicalInfo')).toBeInTheDocument();
  });
});
