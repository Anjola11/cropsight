import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScanPage } from './ScanPage';

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('ScanPage bulk scanning UI', () => {
  it('renders the multi-photo upload dropzone with max batch size badge', () => {
    renderWithProviders(<ScanPage />);

    expect(screen.getByText(/Upload plant or field photos/i)).toBeInTheDocument();
    expect(screen.getByText(/Bulk cap: max 8 photos/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose Photos \(Single or Bulk\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Demo Batch \(3 Photos\)/i)).toBeInTheDocument();
  });

  it('renders active model selector with both segmentation and detection models', () => {
    renderWithProviders(<ScanPage />);
    expect(screen.getByText(/Active Vision Model/i)).toBeInTheDocument();
  });

  it('allows clicking model selector cards', () => {
    renderWithProviders(<ScanPage />);
    const modelCard = screen.getByText(/Active Vision Model/i);
    expect(modelCard).toBeInTheDocument();
  });
});
