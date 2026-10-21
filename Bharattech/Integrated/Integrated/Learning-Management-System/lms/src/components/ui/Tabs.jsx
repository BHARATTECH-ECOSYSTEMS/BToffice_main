import React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const Tabs = TabsPrimitive.Root;

// TabsList
const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-gray-200 p-1 text-gray-600",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

// TabsTrigger
const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm focus:outline-none disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

// TabsContent
const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 focus:outline-none",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
