import React from "react";
import { Icon } from "./Icon";
import { AppLogo } from "./AppLogo";

export type MainTab = "ferias" | "evento" | "ajustes";
export type EventSubTab = "pos" | "results" | "setup";

interface NavItemConfig {
  key: MainTab;
  label: string;
  icon: string;
  activeClass: string;
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    key: "ferias",
    label: "Ferias",
    icon: "storefront",
    activeClass: "bg-[#EDE9FE] text-[#6750A4] dark:bg-[#6750A4]/35 dark:text-[#D0BCFF]",
  },
  {
    key: "evento",
    label: "Feria actual",
    icon: "shopping_bag",
    activeClass: "bg-[#FCE7F3] text-[#9D174D] dark:bg-[#9D174D]/35 dark:text-[#F48FB1]",
  },
  {
    key: "ajustes",
    label: "Ajustes",
    icon: "settings",
    activeClass: "bg-[#E0F2FE] text-[#0369A1] dark:bg-[#0369A1]/35 dark:text-[#7DD3FC]",
  },
];

interface NavigationBarProps {
  currentTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed left-1/2 -translate-x-1/2 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 inline-flex h-16 w-fit max-w-[calc(100vw-2rem)] items-center justify-center gap-1.5 rounded-full bg-surface-container-lowest p-2 shadow-lg ring-1 ring-outline-variant/50 will-change-transform lg:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = currentTab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelectTab(item.key)}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
            className={`m3-nav-pill h-12 text-sm font-bold ${
              active
                ? `${item.activeClass} px-4 shadow-xs`
                : "text-on-surface-variant hover:bg-surface-container-low px-3"
            }`}
          >
            <Icon
              name={item.icon}
              size={24}
              filled={active}
              className={`shrink-0 transition-transform duration-200 ease-out ${
                active ? "scale-105" : "scale-100"
              }`}
            />
            <span className={`m3-pill-label ${active ? "active" : ""}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export const DesktopNavbar: React.FC<NavigationBarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  return (
    <nav
      aria-label="Navegación principal escritorio"
      className="inline-flex h-16 items-center gap-4 rounded-full bg-surface-container-lowest py-2 pl-6 pr-2 shadow-sm ring-1 ring-outline-variant/40"
    >
      {/* Logo de la app dentro de la navbar a la izquierda en color de acento */}
      <button
        type="button"
        onClick={() => onSelectTab('ferias')}
        className="flex items-center rounded-full py-1 pr-1 transition-opacity hover:opacity-85 focus:outline-none"
        aria-label="Feriando - Ir a Ferias"
      >
        <AppLogo className="h-5.5 w-auto text-primary" />
      </button>

      {/* Divisor sutil */}
      <div className="h-6 w-px bg-outline-variant/40" />

      {/* Botones de navegación a la derecha */}
      <div className="flex items-center gap-1.5">
        {NAV_ITEMS.map((item) => {
          const active = currentTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectTab(item.key)}
              aria-current={active ? "page" : undefined}
              className={`m3-nav-pill h-12 px-4 gap-2 text-sm font-bold active:scale-95 ${
                active
                  ? `${item.activeClass} shadow-xs`
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <Icon
                name={item.icon}
                size={22}
                filled={active}
                className={`shrink-0 transition-transform duration-200 ease-out ${
                  active ? "scale-105" : "scale-100"
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const DesktopNavPills = DesktopNavbar;
