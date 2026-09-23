import React from 'react';
import { Settings } from 'lucide-react';

export default function SidebarBottomCard() {
  return (
    <div className="p-4 border-t border-border">
      <div className="bg-gradient-primary rounded-lg p-4 text-white text-center mb-4">
        <div className="text-2xl font-bold mb-1">⚡</div>
        <h4 className="font-medium mb-1">View x Event Limit</h4>
        <p className="text-xs opacity-80 mb-3">2250/45000000 • expires 3 days</p>
        <button className="w-full bg-white/20 hover:bg-white/30 text-white text-xs py-2 rounded-md transition-colors cursor-pointer">
          Learn more
        </button>
      </div>
      
      <button className="w-full bg-foreground text-background py-2 px-4 rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors mb-3 cursor-pointer">
        Upgrade plan →
      </button>
      
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <div className="w-8 h-8 bg-warning rounded-full"></div>
        <Settings className="w-4 h-4" />
      </div>
    </div>
  );
}
