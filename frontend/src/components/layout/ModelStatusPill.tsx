import React from 'react';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

interface ModelStatusResponse {
  success: boolean;
  data: {
    model_ready: boolean;
  };
}

export const ModelStatusPill: React.FC<{ className?: string }> = ({ className }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['model-health'],
    queryFn: () => api.get<ModelStatusResponse>('/').then((r) => r.data),
    refetchInterval: 15000,
    retry: 1,
  });

  const isReady = data?.data?.model_ready === true;

  let statusText = 'Offline';
  let dotColor = 'bg-danger';
  let isPulsing = false;

  if (isLoading) {
    statusText = 'Starting…';
    dotColor = 'bg-warning';
    isPulsing = true;
  } else if (isError) {
    statusText = 'Offline';
    dotColor = 'bg-danger';
  } else if (isReady) {
    statusText = 'Model ready';
    dotColor = 'bg-success';
  } else {
    statusText = 'Starting…';
    dotColor = 'bg-warning';
    isPulsing = true;
  }

  return (
    <div
      className={clsx(
        'border border-line rounded-full bg-card flex items-center justify-center select-none transition-colors duration-150',
        'w-11 h-11 md:w-auto md:h-10 md:px-3.5',
        className
      )}
      title={statusText}
      role="status"
      aria-label={`Model status: ${statusText}`}
    >
      <span
        className={clsx(
          'w-2 h-2 rounded-full shrink-0',
          dotColor,
          isPulsing && 'animate-pulse'
        )}
      />
      <span className="hidden md:inline ml-2 text-[12px] leading-[16px] font-semibold text-primary">
        {statusText}
      </span>
    </div>
  );
};
