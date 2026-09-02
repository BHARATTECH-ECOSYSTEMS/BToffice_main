import React from 'react';
import { NotFound } from '@/components/ui/ghost-404-page';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-center">
      <NotFound />
    </div>
  );
};

export default NotFoundPage;

