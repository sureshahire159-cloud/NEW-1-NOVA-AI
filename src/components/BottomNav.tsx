/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutDashboard, Calendar, Zap, CircleUser } from "lucide-react";
import { WorkspaceTheme } from "../types";

interface BottomNavProps {
  activeTab: "dashboard" | "planner" | "arsenal" | "profile";
  setActiveTab: (tab: "dashboard" | "planner" | "arsenal" | "profile") => void;
  theme: WorkspaceTheme;
}

export default function BottomNav({ activeTab, setActiveTab, theme }: BottomNavProps) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "planner", label: "Planner", icon: Calendar },
    { id: "arsenal", label: "Arsenal", icon: Zap },
    { id: "profile", label: "Profile", icon: CircleUser },
  ] as const;

  const getThemeColors = () => {
    if (theme === "NovaCrimson") {
      return {
        activeBg: "bg-red-600/25 border border-red-550/40 text-red-300 shadow-[0_0_12px_rgba(220,38,38,0.25)] backdrop-blur-lg",
        inactiveText: "text-white/40 hover:text-white/80",
        barBorder: "border-white/10"
      };
    } else {
      return {
        activeBg: "bg-blue-600/25 border border-blue-550/40 text-blue-300 shadow-[0_0_12px_rgba(37,99,235,0.25)] backdrop-blur-lg",
        inactiveText: "text-white/40 hover:text-white/80",
        barBorder: "border-white/10"
      };
    }
  };

  const colors = getThemeColors();

  return (
    <div className={`fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md mx-auto`}>
      <div className={`px-2 py-2 flex items-center justify-around bg-black/60 backdrop-blur-xl rounded-full border ${colors.barBorder} shadow-[0_12px_32px_rgba(0,0,0,0.7)]`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 font-medium text-xs sm:text-sm cursor-pointer select-none ${
                isActive ? colors.activeBg : colors.inactiveText
              }`}
            >
              <Icon className="w-4 h-4" />
              {isActive && (
                <span className="tracking-wide animate-[fadeIn_0.2s_ease-out]">
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
