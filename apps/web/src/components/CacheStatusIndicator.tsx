/**
 * Cache Status Indicator
 * Shows real-time cache performance metrics
 */

import React, { useState, useEffect } from 'react';
import { useCacheService } from '../hooks/useCacheService';

export const CacheStatusIndicator: React.FC = () => {
  const { cacheService, isReady } = useCacheService();
  const [metrics, setMetrics] = useState<{
    hitRate: number;
    missRate: number;
    cacheSize: number;
    totalRequests: number;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Update metrics every 2 seconds
  useEffect(() => {
    if (!isReady || !cacheService) return;

    const updateMetrics = async () => {
      try {
        const newMetrics = await cacheService.getMetrics();
        setMetrics(newMetrics);
      } catch (error) {
        console.error('Failed to get cache metrics:', error);
      }
    };

    // Initial load
    updateMetrics();

    // Set up interval
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, [isReady, cacheService]);

  if (!isReady || !metrics) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="loading-spinner w-4 h-4"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Initializing cache...</span>
        </div>
      </div>
    );
  }

  const hitRatePercentage = (metrics.hitRate * 100).toFixed(1);
  const missRatePercentage = (metrics.missRate * 100).toFixed(1);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Cache Status Summary */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Cache Active</span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium text-green-600 dark:text-green-400">{hitRatePercentage}%</span> hit rate
            </div>
            <div>
              <span className="font-medium">{metrics.totalRequests}</span> requests
            </div>
            <div>
              <span className="font-medium">{metrics.cacheSize}</span> items cached
            </div>
          </div>
        </div>

        {/* Toggle Details Button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Detailed Metrics */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-green-800 font-semibold">Cache Hits</div>
              <div className="text-green-600 text-lg font-bold">
                {hitRatePercentage}%
              </div>
              <div className="text-green-600 text-xs">
                Fast loading from cache
              </div>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-yellow-800 font-semibold">Cache Misses</div>
              <div className="text-yellow-600 text-lg font-bold">
                {missRatePercentage}%
              </div>
              <div className="text-yellow-600 text-xs">
                Loaded from API
              </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-blue-800 font-semibold">Total Requests</div>
              <div className="text-blue-600 text-lg font-bold">
                {metrics.totalRequests}
              </div>
              <div className="text-blue-600 text-xs">
                Since app started
              </div>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-purple-800 font-semibold">Cache Size</div>
              <div className="text-purple-600 text-lg font-bold">
                {metrics.cacheSize}
              </div>
              <div className="text-purple-600 text-xs">
                Items in cache
              </div>
            </div>
          </div>

          {/* Cache Performance Indicator */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Cache Performance</span>
              <span>{hitRatePercentage}% efficient</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${hitRatePercentage}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.hitRate >= 0.8 ? '🚀 Excellent performance' :
               metrics.hitRate >= 0.6 ? '✅ Good performance' :
               metrics.hitRate >= 0.4 ? '⚠️ Fair performance' :
               '🐌 Cache warming up...'}
            </div>
          </div>

          {/* Debug Actions */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Debug Actions</span>
              <div className="space-x-2">
                <button
                  onClick={() => cacheService?.clear()}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                >
                  Clear Cache
                </button>
                <button
                  onClick={() => console.log('Cache metrics:', metrics)}
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                >
                  Log Metrics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheStatusIndicator;
