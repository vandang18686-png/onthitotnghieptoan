import React, { useEffect, useState } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { subscribeCloudStatus, CloudStatus } from '../services/firestoreService';

export const CloudSyncIndicator: React.FC = () => {
  const { t } = useLang();
  const [status, setStatus] = useState<CloudStatus>({
    isConnected: true,
    isMigrated: true,
    isMigrating: false,
    lastSyncTime: null,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeCloudStatus((s) => {
      setStatus(s);
    });
    return () => unsubscribe();
  }, []);

  if (status.error) {
    return (
      <div className="bg-red-500 text-white text-xs px-3 py-1.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full px-4">
          <CloudOff className="w-4 h-4 shrink-0 text-white animate-pulse" />
          <span className="font-semibold">{t('syncErr')}</span>
          <span className="opacity-90">{status.error}</span>
        </div>
      </div>
    );
  }

  if (status.isMigrating) {
    return (
      <div className="bg-brand text-white text-xs px-3 py-1 flex items-center justify-center gap-2 shadow-xs">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>{t('syncMigrating')}</span>
      </div>
    );
  }

  return null;
};
