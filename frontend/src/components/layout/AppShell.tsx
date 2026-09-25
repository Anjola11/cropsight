import React from 'react';
import { TopBar } from './TopBar';
import { SideRail } from './SideRail';
import { BottomTabBar } from './BottomTabBar';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-page text-primary flex flex-col">
      <TopBar />
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-6 flex-1 flex flex-col pb-[calc(88px+env(safe-area-inset-bottom,0px))] lg:pb-8">
        <div className="flex-1 lg:grid lg:grid-cols-[56px_minmax(0,1fr)] lg:gap-6">
          <SideRail />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
};
