import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { SEO } from '../components/common/SEO';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <SEO title="Overview" />
      <PageHeader title="Overview" subtitle="Your recent scans at a glance." />
      <div className="bg-card border border-line rounded-[20px] p-6">
        <EmptyState
          title="No scans yet"
          description="Scan a photo to see data here"
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
