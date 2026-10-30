"use client";

import React, { Children, isValidElement } from 'react';
import { cn } from '@/lib/utils';

interface StickyTabItemProps {
  title: string;
  id: string | number;
  children: React.ReactNode;
}

const StickyTabItem: React.FC<StickyTabItemProps> = () => {
  return null;
};

interface StickyTabsProps {
  children: React.ReactNode;
  mainNavHeight?: string;
  rootClassName?: string;
  navSpacerClassName?: string;
  sectionClassName?: string;
  stickyHeaderContainerClassName?: string;
  headerContentWrapperClassName?: string;
  headerContentLayoutClassName?: string;
  titleClassName?: string;
  contentLayoutClassName?: string;
}

const StickyTabs: React.FC<StickyTabsProps> & { Item: React.FC<StickyTabItemProps> } = ({
  children,
  mainNavHeight = '3.5rem',
  rootClassName = "bg-brand-bg text-white",
  navSpacerClassName = "border-b border-brand-border bg-brand-bg",
  sectionClassName = "bg-brand-bg2",
  stickyHeaderContainerClassName = "shadow-sm",
  headerContentWrapperClassName = "border-b border-t border-brand-border bg-brand-bg2",
  headerContentLayoutClassName = "mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8",
  titleClassName = "my-0 text-2xl font-medium leading-none md:text-3xl lg:text-4xl text-white",
  contentLayoutClassName = "mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8",
}) => {
  const stickyTopValue = `calc(${mainNavHeight} - 1px)`;
  const navHeightStyle = { height: mainNavHeight };
  const stickyHeaderStyle = { top: stickyTopValue };

  return (
    <div className={cn(rootClassName)}>
      <div style={navHeightStyle} className={cn(navSpacerClassName)} />

      {Children.map(children, (child) => {
        if (!isValidElement(child) || child.type !== StickyTabItem) {
          if (process.env.NODE_ENV === 'development' && child != null) {
            console.warn('StickyTabs expects <StickyTabs.Item> as direct children.');
          }
          return null;
        }

        const itemElement = child as React.ReactElement<StickyTabItemProps>;
        const { title, id, children: itemContent } = itemElement.props;

        return (
          <section key={id} id={String(id)} className={cn(sectionClassName)}>
            <div style={stickyHeaderStyle} className={cn("sticky z-40", stickyHeaderContainerClassName)}>
              <div className={cn(headerContentWrapperClassName)}>
                <div className={cn(headerContentLayoutClassName)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={cn(titleClassName)}>{title}</h2>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={cn(contentLayoutClassName)}>
              {itemContent}
            </div>
          </section>
        );
      })}
    </div>
  );
};

StickyTabs.Item = StickyTabItem;

export default StickyTabs;
