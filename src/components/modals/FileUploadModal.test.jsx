import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

import FileUploadModal from './FileUploadModal';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

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
  axios.post.mockReset();
  vi.restoreAllMocks();
});

const chooseUploadFileAndDate = (container) => {
  fireEvent.change(container.querySelector('input[type="file"]'), {
    target: { files: [new File(['data'], 'org.csv', { type: 'text/csv' })] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'choose-date' }));
};

const clickEnabledUploadButton = () => {
  const uploadButtons = screen.getAllByRole('button', {
    name: 'fileUpload.uploadFile',
  });
  const uploadButton = uploadButtons[uploadButtons.length - 1];
  expect(uploadButton.disabled).toBe(false);
  fireEvent.click(uploadButton);
};

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

    chooseUploadFileAndDate(container);

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

  it('downloads the parsing log when invalid rows are skipped', async () => {
    const downloaded = {};
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:parsing-log'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function captureDownload() {
        downloaded.href = this.getAttribute('href');
        downloaded.filename = this.getAttribute('download');
      });
    const onUpload = vi.fn();
    axios.post.mockResolvedValue({
      data: {
        table_id: 42,
        folder_id: 7,
        log: { rejected_rows: [{ row: 3, error_type: 'missing_structure' }] },
      },
    });

    const { container } = render(
      <FileUploadModal
        isOpen
        onClose={() => {}}
        onUpload={onUpload}
        dbPath="/tmp/reference.db"
        preselectedFolderId={7}
        folderStructure={[{ id: 7, name: 'Reference' }]}
      />
    );

    chooseUploadFileAndDate(container);
    clickEnabledUploadButton();

    await waitFor(() => expect(onUpload).toHaveBeenCalled());
    expect(downloaded).toEqual({
      href: 'blob:parsing-log',
      filename: 'parsing_log_table_42.json',
    });
  });

  it('downloads the parsing log when every row is rejected', async () => {
    const downloaded = {};
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:error-log'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function captureDownload() {
        downloaded.href = this.getAttribute('href');
        downloaded.filename = this.getAttribute('download');
      });
    axios.post.mockRejectedValue({
      response: {
        data: {
          error: 'No valid rows were found.',
          log: { rejected_rows: [{ row: 2, error_type: 'invalid_structure' }] },
        },
      },
    });

    const { container } = render(
      <FileUploadModal
        isOpen
        onClose={() => {}}
        onUpload={() => {}}
        dbPath="/tmp/reference.db"
        preselectedFolderId={7}
        folderStructure={[{ id: 7, name: 'Reference' }]}
      />
    );

    chooseUploadFileAndDate(container);
    clickEnabledUploadButton();

    await waitFor(() => expect(downloaded.filename).toBe('parsing_log_upload.json'));
    expect(downloaded.href).toBe('blob:error-log');
  });
});
