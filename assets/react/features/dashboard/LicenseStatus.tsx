import React, { useState } from 'react';

interface LicenseState {
  valid: boolean;
  bot_assigned: boolean;
  error_message?: string;
}

interface LicenseStatusProps {
  licenseState?: LicenseState;
}

const LicenseStatus: React.FC<LicenseStatusProps> = ({ licenseState }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const hasError = !!licenseState?.error_message;

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-mono uppercase tracking-wider text-cyber-primary/60">License:</span>

      {!!licenseState && (
        <div className="flex items-center gap-2">
          {/* Valid Status Icon */}
          <div
            className={`w-4 h-4 ${
              licenseState?.valid
                ? 'hero-check-circle-solid text-cyber-accent shadow-[0_0_6px_rgba(0,255,136,0.5)]'
                : 'hero-x-circle-solid text-cyber-danger shadow-[0_0_6px_rgba(255,51,102,0.5)]'
            }`}
            title={licenseState?.valid ? 'License valid' : 'License invalid'}
          />

          {/* Bot Assigned Status Icon */}
          <div
            className={`w-4 h-4 ${
              licenseState?.bot_assigned
                ? 'hero-cpu-chip-solid text-cyber-secondary shadow-[0_0_6px_rgba(10,132,255,0.5)]'
                : 'hero-user-solid text-cyber-primary/40'
            }`}
            title={licenseState?.bot_assigned ? 'Bot assigned' : 'No bot assigned'}
          />

          {/* Error Icon with Tooltip */}
          {hasError && (
            <div className="flex items-center relative">
              <div
                className="w-4 h-4 hero-exclamation-circle-solid text-cyber-danger cursor-help
                           shadow-[0_0_6px_rgba(255,51,102,0.5)] animate-pulse"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              />

              {showTooltip && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2
                               bg-cyber-dark-800/95 backdrop-blur-sm text-cyber-danger text-[10px] font-mono
                               rounded border border-cyber-danger/50 shadow-[0_0_20px_rgba(255,51,102,0.2)]
                               whitespace-nowrap z-50"
                >
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                    <div className="border-4 border-transparent border-t-cyber-dark-800" />
                  </div>
                  {licenseState.error_message}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!licenseState && <span className="text-[10px] font-mono text-cyber-primary/40">Not configured</span>}
    </div>
  );
};

export default LicenseStatus;
