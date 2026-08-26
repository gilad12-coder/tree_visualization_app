import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it('downloads the verified reference workbook', () => {
    const downloaded = {};
    vi.spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function captureDownload() {
        downloaded.href = this.getAttribute('href');
        downloaded.filename = this.getAttribute('download');
      });

    render(
      <FileUploadModal
        isOpen
        onClose={() => {}}
        onUpload={() => {}}
        dbPath="/tmp/reference.db"
        folderStructure={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', {
      name: 'fileUpload.downloadFiles',
    }));
    fireEvent.click(screen.getByRole('menuitem', {
      name: 'fileUpload.downloadReference',
    }));

    expect(downloaded).toEqual({
      href: '/be-net-reference-upload.xlsx',
      filename: 'be-net-reference-upload.xlsx',
    });
  });

  it('downloads the Hebrew upload guide from the download menu', () => {
    const downloaded = {};
    vi.spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function captureDownload() {
        downloaded.href = this.getAttribute('href');
        downloaded.filename = this.getAttribute('download');
      });

    render(
      <FileUploadModal
        isOpen
        onClose={() => {}}
        onUpload={() => {}}
        dbPath="/tmp/guide.db"
        folderStructure={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', {
      name: 'fileUpload.downloadFiles',
    }));
    fireEvent.click(screen.getByRole('menuitem', {
      name: 'fileUpload.downloadGuide',
    }));

    expect(downloaded).toEqual({
      href: '/מדריך מפורט להעלאת נתונים.pdf',
      filename: 'be-net-file-upload-guide.pdf',
    });
  });
});
