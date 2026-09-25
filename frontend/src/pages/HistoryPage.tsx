import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { SEO } from '../components/common/SEO';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <SEO title="History" />
      <PageHeader
        title="History"
        subtitle="Your last 10 scans, saved on this device."
      />
      <div className="bg-card border border-line rounded-[20px] p-6">
        <EmptyState
          title="No saved scans"
          description="Scans you run appear here."
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate({ to: '/scan' })}
            >
              Scan a photo
            </Button>
          }
        />
      </div>
    </div>
  );
};
