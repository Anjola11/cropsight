import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { SEO } from '../components/common/SEO';

export const ModelPage: React.FC = () => {
  return (
    <div className="w-full">
      <SEO title="Model" />
      <PageHeader
        title="Model"
        subtitle="What the detector was trained to find."
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Detector">
          <p className="text-[13px] leading-[18px] text-muted">
            Model parameters and configuration.
          </p>
        </Card>
        <Card title="Classes">
          <p className="text-[13px] leading-[18px] text-muted">
            Trained target classes.
          </p>
        </Card>
      </div>
    </div>
  );
};
