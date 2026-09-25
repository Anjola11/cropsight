import React from 'react';
import { APP_NAME } from '../../utils/constants';

interface SEOProps {
  title: string;
  description?: string;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description = 'Automated crop monitoring, weed detection, and plant segmentation.',
}) => {
  const fullTitle = title === APP_NAME ? title : `${title} | ${APP_NAME}`;
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
    </>
  );
};
