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
    <div className="flex items-center gap-4">
      <span className="text-gray-400 text-sm">License Status:</span>

      {!!licenseState && (
        <div className="flex items-center gap-3">
          {/* Valid Status Icon */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-5 h-5 ${
                licenseState?.valid ? 'hero-check-circle-solid text-green-500' : 'hero-x-circle-solid text-red-500'
              }`}
              title={licenseState?.valid ? 'License valid' : 'License invalid'}
            />
          </div>

          {/* Bot Assigned Status Icon */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-5 h-5 ${
                licenseState?.bot_assigned ? 'hero-cpu-chip-solid text-blue-500' : 'hero-user-solid text-gray-500'
              }`}
              title={licenseState?.bot_assigned ? 'Bot assigned' : 'No bot assigned'}
            />
          </div>

          {/* Error Icon with Tooltip */}
          {hasError && (
            <div className="flex items-center relative">
              <div
                className="w-5 h-5 hero-exclamation-circle-solid text-red-500 cursor-help"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              />

              {showTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50 border border-red-500/50">
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                    <div className="border-4 border-transparent border-t-gray-900" />
                  </div>
                  {licenseState.error_message}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!licenseState && <div>Not configured</div>}
    </div>
  );
};

export default LicenseStatus;
