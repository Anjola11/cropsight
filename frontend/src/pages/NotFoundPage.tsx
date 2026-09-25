import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { SEO } from '../components/common/SEO';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full flex items-center justify-center min-h-[60vh]">
      <SEO title="Page not found" />
      <EmptyState
        title="Page not found"
        description="That page doesn't exist."
        action={
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate({ to: '/' })}
          >
            Go to overview
          </Button>
        }
      />
    </div>
  );
};
