import React, { useEffect, useRef, useState } from 'react';
import type { FeriaEvent } from '../types';
import {
  applyTheme,
  getPreferences,
  savePreference,
  type ThemeMode,
} from '../utils/preferences';
import { exportEventsToJson, parseImportedEventsJson } from '../utils/storage';
import { Icon } from './Icon';
import { SmoothCollapse } from './SmoothCollapse';
import authorAvatar from './icon/autor.png';

const APP_VERSION = 'v1.0.0';
const AUTHOR_NAME = 'Oniverse';
const GITHUB_REPO_URL = 'https://github.com/OniverseDesign/Feriando';
const GITHUB_ISSUES_URL = 'https://github.com/OniverseDesign/Feriando/issues';
const DONATION_URL = 'https://cafecito.app/oniverse';
const INSTAGRAM_URL = 'https://www.instagram.com/oniverse.design';

const InstagramIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = '',
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AppSettingsScreenProps {
  events: FeriaEvent[];
  onImportEvents: (imported: FeriaEvent[]) => void;
  onClearAllData: () => void;
}

/**
 * M3 Expressive Switch Component
 * Follows Google M3 Expressive guidelines with a capsule track and
 * animated circular thumb containing checkmark / close icons.
 */
interface M3SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

const M3Switch: React.FC<M3SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        checked
          ? 'bg-primary'
          : 'bg-surface-container-highest border border-outline-variant/60'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-300 ease-out ${
          checked
            ? 'translate-x-6 bg-on-primary text-primary shadow-xs'
            : 'translate-x-0 bg-outline text-surface-container-highest'
        }`}
      >
        {checked ? (
          <Icon name="check" size={14} className="font-black" />
        ) : (
          <Icon name="close" size={13} className="font-black" />
        )}
      </span>
    </button>
  );
};

export const AppSettingsScreen: React.FC<AppSettingsScreenProps> = ({
  events,
  onImportEvents,
  onClearAllData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // App preferences (persisted locally)
  const [preferences, setPreferences] = useState(() => getPreferences());

  const handleTogglePreference = (
    key: 'hapticFeedback' | 'confirmDelete' | 'quickPaymentReminder',
    val: boolean
  ) => {
    savePreference(key, val);
    setPreferences((prev) => ({ ...prev, [key]: val }));
    if (key === 'hapticFeedback' && val && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  };

  const handleThemeModeChange = (mode: ThemeMode) => {
    savePreference('themeMode', mode);
    applyTheme(mode);
    setPreferences((prev) => ({ ...prev, themeMode: mode }));
    if (preferences.hapticFeedback && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  };

  useEffect(() => {
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const totalSales = events.reduce((sum, e) => sum + e.sales.length, 0);
  const totalProducts = events.reduce((sum, e) => sum + e.products.length, 0);

  const showMessage = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleExport = () => {
    const json = exportEventsToJson(events);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feriando-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage('Respaldo JSON descargado correctamente.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseImportedEventsJson(String(reader.result ?? ''));
        onImportEvents(imported);
        showMessage(`Se importaron ${imported.length} feria(s) correctamente.`);
      } catch (err) {
        showMessage(err instanceof Error ? err.message : 'Error al importar JSON.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleInstallPwa = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
        showMessage('¡Feriando se instaló en tu dispositivo!');
      }
      return;
    }
    setShowInstallGuide((prev) => !prev);
  };

  const handleFactoryReset = () => {
    if (events.length === 0) return;
    const confirmed = window.confirm(
      `¿Seguro que quieres borrar todas las ferias (${events.length}) y sus ventas? Te recomendamos exportar un respaldo JSON antes.`
    );
    if (confirmed) {
      onClearAllData();
      showMessage('Todos los datos locales fueron eliminados.');
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:pb-12">
      {/* Section Header */}
      <div className="pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
          Ajustes
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Personaliza tu experiencia, gestiona respaldos y consulta información de la app
        </p>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div className="flex items-center gap-3 rounded-[24px] bg-secondary-container px-4 py-3.5 text-sm font-bold text-on-secondary-container shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <Icon name="check_circle" size={20} filled />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {/* Columna Izquierda: Preferencias + Zona de Peligro */}
        <div className="space-y-6">
          {/* SECTION 1: Preferencias de Uso (M3 Expressive Switches + PWA) */}
          <section className="space-y-2">
            <h3 className="px-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Preferencias de Uso
            </h3>
            <div className="divide-y divide-outline-variant/20 overflow-hidden rounded-[28px] bg-surface-container-low border border-outline-variant/15 shadow-xs">
              {/* Item 0: Tema de la aplicación (M3 Segmented Button) */}
              <div className="p-4 sm:px-5 sm:py-4.5 transition-colors hover:bg-surface-container/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-highest/60 text-on-surface-variant">
                      <Icon
                        name={
                          preferences.themeMode === 'dark'
                            ? 'dark_mode'
                            : preferences.themeMode === 'light'
                            ? 'light_mode'
                            : 'brightness_auto'
                        }
                        size={22}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[15px] sm:text-base font-bold text-on-surface leading-tight">
                        Aspecto visual
                      </h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                        Elige entre tema claro, oscuro o sincronizado con el sistema.
                      </p>
                    </div>
                  </div>

                  {/* M3 Expressive Segmented Button */}
                  <div className="flex w-full sm:w-auto items-center rounded-full bg-surface-container-highest/70 p-1 border border-outline-variant/30 shrink-0">
                    {(
                      [
                        { id: 'system', label: 'Auto', icon: 'brightness_auto' },
                        { id: 'light', label: 'Claro', icon: 'light_mode' },
                        { id: 'dark', label: 'Oscuro', icon: 'dark_mode' },
                      ] as const
                    ).map((t) => {
                      const active = preferences.themeMode === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleThemeModeChange(t.id)}
                          className={`m3-btn-xs flex-1 sm:flex-initial sm:px-4 rounded-full text-xs font-bold transition-all justify-center ${
                            active
                              ? 'bg-primary text-on-primary shadow-xs'
                              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                          }`}
                        >
                          <Icon name={t.icon} size={15} />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Item 1: Vibración Háptica */}
              <div className="flex items-center justify-between gap-4 p-4 sm:px-5 sm:py-4.5 transition-colors hover:bg-surface-container/30">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-highest/60 text-on-surface-variant">
                    <Icon name="vibration" size={22} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[15px] sm:text-base font-bold text-on-surface leading-tight">
                      Respuesta háptica
                    </h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                      Vibrar suavemente el dispositivo al registrar cobros y añadir artículos.
                    </p>
                  </div>
                </div>
                <M3Switch
                  checked={preferences.hapticFeedback}
                  onChange={(val) => handleTogglePreference('hapticFeedback', val)}
                  ariaLabel="Respuesta háptica"
                />
              </div>

              {/* Item 2: Confirmar Eliminación */}
              <div className="flex items-center justify-between gap-4 p-4 sm:px-5 sm:py-4.5 transition-colors hover:bg-surface-container/30">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-highest/60 text-on-surface-variant">
                    <Icon name="delete_sweep" size={22} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[15px] sm:text-base font-bold text-on-surface leading-tight">
                      Confirmar eliminación
                    </h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                      Pedir confirmación previa al borrar ferias, ventas o artículos del stand.
                    </p>
                  </div>
                </div>
                <M3Switch
                  checked={preferences.confirmDelete}
                  onChange={(val) => handleTogglePreference('confirmDelete', val)}
                  ariaLabel="Confirmar eliminación"
                />
              </div>

              {/* Item 3: Recordar último método de pago */}
              <div className="flex items-center justify-between gap-4 p-4 sm:px-5 sm:py-4.5 transition-colors hover:bg-surface-container/30">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-highest/60 text-on-surface-variant">
                    <Icon name="history" size={22} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[15px] sm:text-base font-bold text-on-surface leading-tight">
                      Recordar método de cobro
                    </h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                      Mantener automáticamente el último método seleccionado (Efectivo o Transferencia).
                    </p>
                  </div>
                </div>
                <M3Switch
                  checked={preferences.quickPaymentReminder}
                  onChange={(val) => handleTogglePreference('quickPaymentReminder', val)}
                  ariaLabel="Recordar método de cobro"
                />
              </div>

              {/* Item 4: Instalar en este dispositivo (PWA) */}
              <div className="p-4 sm:px-5 sm:py-4.5 transition-colors hover:bg-surface-container/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-highest/60 text-on-surface-variant">
                      <Icon name="install_mobile" size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[15px] sm:text-base font-bold text-on-surface leading-tight">
                        Instalar en este dispositivo
                      </h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                        Úsala como app nativa a pantalla completa desde tu pantalla de inicio.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleInstallPwa}
                    className="m3-btn-xs bg-surface-container-highest text-xs font-bold text-on-surface hover:bg-secondary-container"
                  >
                    <Icon name={showInstallGuide ? 'expand_less' : 'open_in_new'} size={16} />
                    {installPrompt ? 'Instalar' : showInstallGuide ? 'Cerrar' : 'Guía'}
                  </button>
                </div>

                <SmoothCollapse isOpen={showInstallGuide}>
                  <div className="mt-3.5 space-y-2 rounded-[20px] bg-surface-container-lowest p-4 text-xs leading-relaxed text-on-surface-variant border border-outline-variant/15">
                    <p>
                      <strong className="text-on-surface">Android (Chrome):</strong> Toca el menú{' '}
                      <strong>⋮</strong> arriba a la derecha y selecciona{' '}
                      <strong>&quot;Instalar aplicación&quot;</strong> o{' '}
                      <strong>&quot;Agregar a la pantalla principal&quot;</strong>.
                    </p>
                    <p>
                      <strong className="text-on-surface">iPhone / iPad (Safari):</strong> Toca el botón{' '}
                      <strong>Compartir</strong> (cuadrado con flecha hacia arriba) y selecciona{' '}
                      <strong>&quot;Agregar a inicio&quot;</strong>.
                    </p>
                  </div>
                </SmoothCollapse>
              </div>
            </div>
          </section>
        </div>

        {/* Columna Derecha: Datos & Respaldo + Acerca de Feriando */}
        <div className="space-y-6">
          {/* SECTION 2: Datos y Respaldo Local */}
          <section className="space-y-2">
            <h3 className="px-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Datos &amp; Respaldo Local
            </h3>
            <div className="divide-y divide-outline-variant/20 overflow-hidden rounded-[28px] bg-surface-container-low border border-outline-variant/15 shadow-xs">
              {/* Storage stats header bar */}
              <div className="bg-surface-container/40 p-4 sm:px-5">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-[18px] bg-surface-container-lowest p-3 text-center border border-outline-variant/10">
                    <div className="text-xl sm:text-2xl font-black text-on-surface">{events.length}</div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Ferias
                    </div>
                  </div>
                  <div className="rounded-[18px] bg-surface-container-lowest p-3 text-center border border-outline-variant/10">
                    <div className="text-xl sm:text-2xl font-black text-primary">{totalSales}</div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Ventas
                    </div>
                  </div>
                  <div className="rounded-[18px] bg-surface-container-lowest p-3 text-center border border-outline-variant/10">
                    <div className="text-xl sm:text-2xl font-black text-on-surface">{totalProducts}</div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Artículos
                    </div>
                  </div>
                </div>
              </div>

              {/* Row: Exportar JSON */}
              <div className="flex items-center justify-between gap-4 p-4 sm:px-5 sm:py-4.5 transition-colors hover:bg-surface-container/30">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                    <Icon name="upload" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[15px] sm:text-base font-bold text-on-surface leading-tight">
                      Exportar Respaldo
                    </h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                      Descarga un archivo .JSON con todas tus ferias y productos guardados.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={events.length === 0}
                  className="m3-btn-xs bg-primary text-xs font-bold text-on-primary hover:opacity-95 disabled:opacity-40"
                >
                  <Icon name="upload" size={16} />
                  Exportar
                </button>
              </div>

              {/* Row: Importar JSON */}
              <div className="flex items-center justify-between gap-4 p-4 sm:px-5 sm:py-4.5 transition-colors hover:bg-surface-container/30">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                    <Icon name="download" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[15px] sm:text-base font-bold text-on-surface leading-tight">
                      Importar Respaldo
                    </h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                      Restaura o combina ferias desde un archivo .JSON exportado previamente.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="m3-btn-xs bg-secondary-container text-xs font-bold text-on-secondary-container hover:opacity-90"
                >
                  <Icon name="download" size={16} />
                  Importar
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </div>
            </div>
          </section>

          {/* SECTION 3: Acerca de Feriando */}
          <section className="space-y-2">
            <h3 className="px-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Acerca de Feriando
            </h3>
            <div className="divide-y divide-outline-variant/20 overflow-hidden rounded-[28px] bg-surface-container-low border border-outline-variant/15 shadow-xs">
              {/* Row 1: Versión */}
              <div className="flex items-center justify-between gap-4 p-4 sm:px-5 sm:py-4.5">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-highest/60 text-on-surface-variant">
                    <Icon name="info" size={20} filled />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[15px] sm:text-base font-bold text-on-surface leading-tight">
                      Versión
                    </h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                      React 19 + Tailwind • Material 3 Expressive
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-surface-container-highest px-3 py-1 text-xs font-bold text-on-surface-variant">
                  {APP_VERSION}
                </span>
              </div>

              {/* Row 2: Creador / Autor con Instagram */}
              <div className="flex items-center justify-between gap-4 p-4 sm:px-5 sm:py-4.5 transition-colors hover:bg-surface-container/30">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={authorAvatar}
                    alt={AUTHOR_NAME}
                    className="h-10 w-10 shrink-0 rounded-full object-cover border border-outline-variant/30 shadow-2xs"
                  />
                  <div className="min-w-0">
                    <h4 className="text-[15px] sm:text-base font-bold text-on-surface leading-tight">
                      Autor
                    </h4>
                    <a
                      href={INSTAGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors leading-relaxed mt-0.5"
                    >
                      <span>@oniverse.design</span>
                    </a>
                  </div>
                </div>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="m3-btn-xs bg-surface-container-highest text-xs font-bold text-on-surface hover:bg-primary hover:text-on-primary transition-colors shrink-0"
                >
                  <InstagramIcon size={14} />
                  <span>Seguir</span>
                  <Icon name="arrow_outward" size={14} />
                </a>
              </div>

              {/* Row 3: Apoyo / Donación (Cafecito) - Directamente bajo el autor */}
              <div className="flex items-center justify-between gap-4 p-4 sm:px-5 sm:py-4.5 transition-colors hover:bg-surface-container/30">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container">
                    <Icon name="local_cafe" size={20} filled />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[15px] sm:text-base font-bold text-on-surface leading-tight">
                      Invitar un Cafecito
                    </h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                      Feriando es gratuita y sin anuncios. Podés apoyar su desarrollo continuo.
                    </p>
                  </div>
                </div>
                <a
                  href={DONATION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="m3-btn-xs bg-tertiary text-xs font-bold text-on-tertiary hover:opacity-95"
                >
                  <Icon name="volunteer_activism" size={16} filled />
                  Cafecito
                </a>
              </div>

              {/* Row 4: Repositorio GitHub */}
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-4 p-4 sm:px-5 sm:py-4.5 transition-colors hover:bg-surface-container/30 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-highest/60 text-on-surface-variant">
                    <Icon name="code" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[15px] sm:text-base font-bold text-on-surface leading-tight group-hover:text-primary">
                      Código Abierto
                    </h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                      Visita el repositorio oficial en GitHub.
                    </p>
                  </div>
                </div>
                <Icon name="arrow_outward" size={18} className="text-on-surface-variant group-hover:text-primary" />
              </a>

              {/* Row 5: Feedback / Reportar error */}
              <a
                href={GITHUB_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-4 p-4 sm:px-5 sm:py-4.5 transition-colors hover:bg-surface-container/30 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-highest/60 text-on-surface-variant">
                    <Icon name="bug_report" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[15px] sm:text-base font-bold text-on-surface leading-tight group-hover:text-primary">
                      Reportar sugerencia o error
                    </h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                      Abrir un issue con propuestas o problemas encontrados.
                    </p>
                  </div>
                </div>
                <Icon name="arrow_outward" size={18} className="text-on-surface-variant group-hover:text-primary" />
              </a>
            </div>
          </section>
        </div>
      </div>

      {/* SECTION 4: Zona de Peligro (al final de todos los ajustes) */}
      <section className="space-y-2 pt-2">
        <h3 className="px-3 text-xs font-bold uppercase tracking-wider text-error">
          Zona de Peligro
        </h3>
        <div className="overflow-hidden rounded-[28px] border border-error/25 bg-error-container/25 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:px-5 sm:py-4.5">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/15 text-error">
                <Icon name="delete_forever" size={22} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] sm:text-base font-bold text-error leading-tight">
                  Borrar todos los datos
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                  Elimina irreversiblemente todas las ferias, productos y ventas de este dispositivo.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFactoryReset}
              disabled={events.length === 0}
              className="m3-btn-xs bg-error text-xs font-bold text-on-error hover:opacity-90 disabled:opacity-40 self-start sm:self-auto shrink-0"
            >
              <Icon name="delete" size={16} />
              Restablecer
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};
