import React, { useCallback, useEffect, useState } from 'react';

import { ServerEvent } from '@/react/constants/serverEvent';
import { usePushEventAsync } from '@/react/hooks/usePushEventAsync';

interface ShareLink {
  id: string;
  token: string;
  expires_at: string;
  label: string | null;
  url: string;
  is_expired: boolean;
}

interface ShareLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  pushEvent: (event: string, payload: any, callback?: (reply: any) => void) => void;
}

export const ShareLinksModal: React.FC<ShareLinksModalProps> = ({ isOpen, onClose, pushEvent }) => {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [expirationHours, setExpirationHours] = useState(24);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pushEventAsync = usePushEventAsync({ pushEvent });

  const loadLinks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await pushEventAsync(ServerEvent.GET_SHARE_LINKS, {});
      if (response?.links) {
        setLinks(response.links);
      }
    } finally {
      setIsLoading(false);
    }
  }, [pushEventAsync]);

  useEffect(() => {
    if (isOpen) {
      loadLinks();
    }
  }, [isOpen, loadLinks]);

  const handleCreateLink = async () => {
    setIsLoading(true);
    try {
      const response = await pushEventAsync(ServerEvent.CREATE_SHARE_LINK, {
        expiresInHours: expirationHours,
      });
      if (response?.success && response?.link) {
        setLinks(prev => [response.link, ...prev]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    const response = await pushEventAsync(ServerEvent.DELETE_SHARE_LINK, { linkId });
    if (response?.success) {
      setLinks(prev => prev.filter(l => l.id !== linkId));
    }
  };

  const handleCopyLink = (link: ShareLink) => {
    navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatExpiresAt = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gray-800 border border-orange-500/30 rounded-lg w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-mono text-orange-400">Share Dashboard</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Create new link section */}
        <div className="px-6 py-4 border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <select
              value={expirationHours}
              onChange={e => setExpirationHours(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
            >
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={24}>24 hours</option>
              <option value={72}>3 days</option>
              <option value={168}>7 days</option>
            </select>
            <button
              onClick={handleCreateLink}
              disabled={isLoading}
              className="px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded text-orange-400 text-sm font-mono hover:bg-orange-500/30 hover:border-orange-500 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        </div>

        {/* Links list */}
        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          {isLoading && links.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4 font-mono">Loading...</p>
          ) : links.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4 font-mono">No share links created yet</p>
          ) : (
            <div className="space-y-3">
              {links.map(link => (
                <div
                  key={link.id}
                  className={`flex items-center justify-between p-3 rounded border ${
                    link.is_expired ? 'border-red-500/30 bg-red-500/5' : 'border-gray-600 bg-gray-700/50'
                  }`}
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm text-white font-mono truncate" title={link.url}>
                      {link.url}
                    </p>
                    <p className={`text-xs mt-1 ${link.is_expired ? 'text-red-400' : 'text-gray-400'}`}>
                      {link.is_expired ? 'Expired' : `Expires: ${formatExpiresAt(link.expires_at)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(link)}
                      className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                      title="Copy link"
                    >
                      {copiedId === link.id ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-4 h-4 text-green-400"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-4 h-4 text-gray-400"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                          />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                      title="Delete link"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4 text-red-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareLinksModal;
