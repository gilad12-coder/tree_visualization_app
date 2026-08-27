import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import EnhancedNodeCard from './EnhancedNodeCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => key,
    i18n: { language: 'en' },
  }),
}));

describe('EnhancedNodeCard', () => {
  const renderCard = personId => render(
    <EnhancedNodeCard
      node={{
        person_id: personId,
        hierarchical_structure: '/1',
        children: [],
      }}
      onClose={() => {}}
      tableId={1}
      folderId={1}
    />
  );

  it('does not offer person-wide updates for a vacant position', () => {
    renderCard(null);

    expect(screen.queryByText('nodeCard.updateInformation')).not.toBeInTheDocument();
  });

  it('offers person-wide updates when a person ID is available', () => {
    renderCard('EMP-001');

    expect(screen.getByText('nodeCard.updateInformation')).toBeInTheDocument();
  });
});
