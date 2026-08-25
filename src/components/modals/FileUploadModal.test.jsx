import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FileUploadModal from './FileUploadModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: key => key }),
}));

vi.mock('../common/DatePickerWrapper', () => ({
  default: ({ handleDateChange }) => (
    <button onClick={() => handleDateChange(new Date(2026, 7, 19))}>
      choose-date
    </button>
  ),
}));

describe('FileUploadModal', () => {
  it('does not submit a folder id missing from the active database', () => {
    const { container } = render(
      <FileUploadModal
        isOpen
        onClose={() => {}}
        onUpload={() => {}}
        dbPath="/tmp/new.db"
        preselectedFolderId={1}
        folderStructure={[]}
      />
    );

    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [new File(['data'], 'org.csv', { type: 'text/csv' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'choose-date' }));

    const uploadButtons = screen.getAllByRole('button', {
      name: 'fileUpload.uploadFile',
    });
    expect(uploadButtons.some(button => button.disabled)).toBe(true);
  });
});
