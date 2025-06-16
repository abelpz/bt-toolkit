# Data Dashboards with Linked Panels

This guide shows how to build interactive data dashboards with synchronized charts, filters, and real-time updates using the Linked Panels library.

## Overview

Data dashboards are ideal for Linked Panels because they need:
- Synchronized filtering across multiple charts
- Cross-panel drill-down capabilities  
- Real-time data updates
- Interactive data exploration
- Persistent view states
- Export and sharing functionality

## Basic Dashboard Setup

### Data Models

```tsx
// types/dashboard.ts
export interface DataPoint {
  id: string;
  timestamp: Date;
  value: number;
  category: string;
  metadata: Record<string, any>;
}

export interface ChartConfig {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'scatter';
  dataSource: string;
  xAxis: string;
  yAxis: string;
  filters: FilterConfig[];
}

export interface FilterConfig {
  id: string;
  field: string;
  type: 'range' | 'select' | 'search' | 'date';
  label: string;
  options?: string[];
  min?: number;
  max?: number;
}

export interface DashboardFilter {
  field: string;
  operator: 'equals' | 'contains' | 'between' | 'greater' | 'less';
  value: any;
}
```

### Chart Components

```tsx
// components/LineChart.tsx
import React, { useMemo } from 'react';
import { useResourceAPI } from 'linked-panels';
import { DataPoint, DashboardFilter } from '../types/dashboard';

interface LineChartProps {
  id: string;
  title: string;
  data: DataPoint[];
  xField: string;
  yField: string;
}

export function LineChart({ id, title, data, xField, yField }: LineChartProps) {
  const api = useResourceAPI(`chart-${id}`);
  
  // Listen for filter changes
  const messages = api.messaging.getMessagesByType('filter-changed');
  const activeFilters = useMemo(() => {
    const filterMessages = messages.filter(msg => msg.content.lifecycle === 'state');
    return filterMessages.length > 0 
      ? filterMessages[filterMessages.length - 1].content.data.filters 
      : [];
  }, [messages]);
  
  // Apply filters to data
  const filteredData = useMemo(() => {
    return data.filter(point => {
      return activeFilters.every((filter: DashboardFilter) => {
        const value = point[filter.field as keyof DataPoint];
        
        switch (filter.operator) {
          case 'equals':
            return value === filter.value;
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'greater':
            return Number(value) > Number(filter.value);
          case 'less':
            return Number(value) < Number(filter.value);
          case 'between':
            return Number(value) >= filter.value[0] && Number(value) <= filter.value[1];
          default:
            return true;
        }
      });
    });
  }, [data, activeFilters]);
  
  const handlePointClick = (point: DataPoint) => {
    // Send drill-down event
    api.messaging.send('*', {
      type: 'chart-point-clicked',
      lifecycle: 'event',
      data: {
        chartId: id,
        point,
        timestamp: Date.now()
      }
    });
  };
  
  const handleZoom = (range: { start: Date; end: Date }) => {
    // Send zoom state to other charts
    api.messaging.send('*', {
      type: 'chart-zoom-changed',
      lifecycle: 'state',
      data: {
        chartId: id,
        range,
        timestamp: Date.now()
      }
    });
  };
  
  return (
    <div className="line-chart">
      <header className="chart-header">
        <h3>{title}</h3>
        <div className="chart-stats">
          <span>{filteredData.length} data points</span>
          {activeFilters.length > 0 && (
            <span className="filtered">({activeFilters.length} filters active)</span>
          )}
        </div>
      </header>
      
      <div className="chart-container">
        <svg width="100%" height="300" viewBox="0 0 800 300">
          {/* Simple line chart implementation */}
          {filteredData.map((point, index) => {
            const x = (index / (filteredData.length - 1)) * 780 + 10;
            const y = 290 - (point.value / Math.max(...filteredData.map(p => p.value))) * 270;
            
            return (
              <circle
                key={point.id}
                cx={x}
                cy={y}
                r="4"
                fill="#3b82f6"
                className="chart-point"
                onClick={() => handlePointClick(point)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
          
          {/* Connect points with lines */}
          {filteredData.length > 1 && (
            <polyline
              points={filteredData.map((point, index) => {
                const x = (index / (filteredData.length - 1)) * 780 + 10;
                const y = 290 - (point.value / Math.max(...filteredData.map(p => p.value))) * 270;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>
      
      <div className="chart-controls">
        <button onClick={() => handleZoom({ start: new Date(Date.now() - 86400000), end: new Date() })}>
          Last 24h
        </button>
        <button onClick={() => handleZoom({ start: new Date(Date.now() - 604800000), end: new Date() })}>
          Last 7d
        </button>
        <button onClick={() => handleZoom({ start: new Date(Date.now() - 2592000000), end: new Date() })}>
          Last 30d
        </button>
      </div>
    </div>
  );
}
```

```tsx
// components/FilterPanel.tsx
import React, { useState } from 'react';
import { useResourceAPI } from 'linked-panels';
import { FilterConfig, DashboardFilter } from '../types/dashboard';

interface FilterPanelProps {
  filters: FilterConfig[];
}

export function FilterPanel({ filters }: FilterPanelProps) {
  const api = useResourceAPI('filters');
  const [activeFilters, setActiveFilters] = useState<DashboardFilter[]>([]);
  
  const handleFilterChange = (field: string, operator: string, value: any) => {
    const newFilters = [
      ...activeFilters.filter(f => f.field !== field),
      { field, operator, value }
    ].filter(f => f.value !== null && f.value !== '');
    
    setActiveFilters(newFilters);
    
    // Broadcast filter changes
    api.messaging.send('*', {
      type: 'filter-changed',
      lifecycle: 'state',
      data: {
        filters: newFilters,
        timestamp: Date.now()
      }
    });
  };
  
  const clearAllFilters = () => {
    setActiveFilters([]);
    api.messaging.send('*', {
      type: 'filter-changed',
      lifecycle: 'state',
      data: {
        filters: [],
        timestamp: Date.now()
      }
    });
  };
  
  const renderFilter = (filter: FilterConfig) => {
    const currentFilter = activeFilters.find(f => f.field === filter.field);
    
    switch (filter.type) {
      case 'select':
        return (
          <select
            value={currentFilter?.value || ''}
            onChange={(e) => handleFilterChange(filter.field, 'equals', e.target.value)}
          >
            <option value="">All {filter.label}</option>
            {filter.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
        
      case 'range':
        return (
          <div className="range-filter">
            <input
              type="number"
              placeholder={`Min ${filter.label}`}
              min={filter.min}
              max={filter.max}
              value={currentFilter?.value?.[0] || ''}
              onChange={(e) => {
                const min = Number(e.target.value);
                const max = currentFilter?.value?.[1] || filter.max;
                handleFilterChange(filter.field, 'between', [min, max]);
              }}
            />
            <input
              type="number"
              placeholder={`Max ${filter.label}`}
              min={filter.min}
              max={filter.max}
              value={currentFilter?.value?.[1] || ''}
              onChange={(e) => {
                const min = currentFilter?.value?.[0] || filter.min;
                const max = Number(e.target.value);
                handleFilterChange(filter.field, 'between', [min, max]);
              }}
            />
          </div>
        );
        
      case 'search':
        return (
          <input
            type="text"
            placeholder={`Search ${filter.label}`}
            value={currentFilter?.value || ''}
            onChange={(e) => handleFilterChange(filter.field, 'contains', e.target.value)}
          />
        );
        
      case 'date':
        return (
          <div className="date-filter">
            <input
              type="date"
              value={currentFilter?.value?.[0] || ''}
              onChange={(e) => {
                const start = e.target.value;
                const end = currentFilter?.value?.[1] || '';
                handleFilterChange(filter.field, 'between', [start, end]);
              }}
            />
            <input
              type="date"
              value={currentFilter?.value?.[1] || ''}
              onChange={(e) => {
                const start = currentFilter?.value?.[0] || '';
                const end = e.target.value;
                handleFilterChange(filter.field, 'between', [start, end]);
              }}
            />
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="filter-panel">
      <header className="filter-header">
        <h3>Filters</h3>
        {activeFilters.length > 0 && (
          <button onClick={clearAllFilters} className="clear-filters">
            Clear All ({activeFilters.length})
          </button>
        )}
      </header>
      
      <div className="filters-list">
        {filters.map(filter => (
          <div key={filter.id} className="filter-group">
            <label className="filter-label">{filter.label}</label>
            {renderFilter(filter)}
          </div>
        ))}
      </div>
      
      {activeFilters.length > 0 && (
        <div className="active-filters">
          <h4>Active Filters:</h4>
          <ul>
            {activeFilters.map((filter, index) => (
              <li key={index} className="active-filter">
                <span className="filter-field">{filter.field}</span>
                <span className="filter-operator">{filter.operator}</span>
                <span className="filter-value">
                  {Array.isArray(filter.value) ? filter.value.join(' - ') : filter.value}
                </span>
                <button 
                  onClick={() => {
                    const newFilters = activeFilters.filter((_, i) => i !== index);
                    setActiveFilters(newFilters);
                    api.messaging.send('*', {
                      type: 'filter-changed',
                      lifecycle: 'state',
                      data: { filters: newFilters, timestamp: Date.now() }
                    });
                  }}
                  className="remove-filter"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Complete Dashboard System

```tsx
// DataDashboard.tsx
import React, { useState, useMemo } from 'react';
import {
  LinkedPanelsContainer,
  LinkedPanel,
  createDefaultPluginRegistry,
  LocalStorageAdapter
} from 'linked-panels';
import { LineChart } from './components/LineChart';
import { FilterPanel } from './components/FilterPanel';
import { DataPoint, FilterConfig, ChartConfig } from './types/dashboard';

// Sample data
const generateSampleData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  const categories = ['Sales', 'Marketing', 'Support', 'Development'];
  
  for (let i = 0; i < 100; i++) {
    data.push({
      id: `point-${i}`,
      timestamp: new Date(Date.now() - (100 - i) * 86400000), // Last 100 days
      value: Math.floor(Math.random() * 1000) + 100,
      category: categories[Math.floor(Math.random() * categories.length)],
      metadata: {
        region: Math.random() > 0.5 ? 'North' : 'South',
        priority: Math.random() > 0.7 ? 'High' : 'Normal'
      }
    });
  }
  
  return data;
};

export function DataDashboard() {
  const [data] = useState<DataPoint[]>(generateSampleData());
  
  const filterConfigs: FilterConfig[] = [
    {
      id: 'category',
      field: 'category',
      type: 'select',
      label: 'Category',
      options: ['Sales', 'Marketing', 'Support', 'Development']
    },
    {
      id: 'value',
      field: 'value',
      type: 'range',
      label: 'Value',
      min: 0,
      max: 1200
    },
    {
      id: 'region',
      field: 'metadata.region',
      type: 'select',
      label: 'Region',
      options: ['North', 'South']
    },
    {
      id: 'date',
      field: 'timestamp',
      type: 'date',
      label: 'Date Range'
    }
  ];
  
  const chartConfigs: ChartConfig[] = [
    {
      id: 'sales-trend',
      title: 'Sales Trend',
      type: 'line',
      dataSource: 'main',
      xAxis: 'timestamp',
      yAxis: 'value',
      filters: []
    },
    {
      id: 'category-performance',
      title: 'Category Performance',
      type: 'bar',
      dataSource: 'main',
      xAxis: 'category',
      yAxis: 'value',
      filters: []
    }
  ];
  
  const config = useMemo(() => ({
    resources: [
      // Filter panel
      {
        id: 'filters',
        component: <FilterPanel filters={filterConfigs} />,
        title: 'Filters',
        category: 'controls'
      },
      // Chart resources
      ...chartConfigs.map(chart => ({
        id: `chart-${chart.id}`,
        component: (
          <LineChart
            id={chart.id}
            title={chart.title}
            data={data}
            xField={chart.xAxis}
            yField={chart.yAxis}
          />
        ),
        title: chart.title,
        category: 'charts'
      })),
      // Summary panel
      {
        id: 'summary',
        component: <DashboardSummary data={data} />,
        title: 'Summary',
        category: 'overview'
      }
    ],
    panels: {
      'sidebar-panel': {
        resourceIds: ['filters', 'summary'],
        initialResourceId: 'filters'
      },
      'main-panel': {
        resourceIds: chartConfigs.map(c => `chart-${c.id}`),
        initialResourceId: 'chart-sales-trend'
      }
    }
  }), [data]);
  
  const persistenceOptions = {
    storageAdapter: new LocalStorageAdapter(),
    storageKey: 'data-dashboard-state',
    autoSave: true,
    debounceMs: 300,
    includeMessages: true,
    messageFilter: (message: any) => message.content.lifecycle === 'state'
  };
  
  const plugins = createDefaultPluginRegistry();
  
  return (
    <div className="data-dashboard">
      <header className="dashboard-header">
        <h1>Analytics Dashboard</h1>
        <div className="dashboard-actions">
          <button onClick={() => window.print()}>Export PDF</button>
          <button onClick={() => {/* Refresh data */}}>Refresh Data</button>
        </div>
      </header>
      
      <LinkedPanelsContainer
        config={config}
        plugins={plugins}
        persistence={persistenceOptions}
      >
        <div className="dashboard-layout">
          <LinkedPanel id="sidebar-panel" className="dashboard-sidebar">
            {({ current, navigate }) => (
              <div className="sidebar-container">
                <nav className="sidebar-nav">
                  <button
                    onClick={() => navigate.toResource('filters')}
                    className={current.resource?.id === 'filters' ? 'active' : ''}
                  >
                    🎛️ Filters
                  </button>
                  <button
                    onClick={() => navigate.toResource('summary')}
                    className={current.resource?.id === 'summary' ? 'active' : ''}
                  >
                    📊 Summary
                  </button>
                </nav>
                <div className="sidebar-content">
                  {current.resource?.component}
                </div>
              </div>
            )}
          </LinkedPanel>
          
          <LinkedPanel id="main-panel" className="dashboard-main">
            {({ current, navigate }) => (
              <div className="main-container">
                <nav className="chart-nav">
                  {current.panel.resources.map(resource => (
                    <button
                      key={resource.id}
                      onClick={() => navigate.toResource(resource.id)}
                      className={current.resource?.id === resource.id ? 'active' : ''}
                    >
                      {resource.title}
                    </button>
                  ))}
                </nav>
                <div className="chart-content">
                  {current.resource?.component}
                </div>
              </div>
            )}
          </LinkedPanel>
        </div>
      </LinkedPanelsContainer>
    </div>
  );
}

// Dashboard Summary Component
function DashboardSummary({ data }: { data: DataPoint[] }) {
  const api = useResourceAPI('summary');
  
  // Listen for filter changes to update summary
  const messages = api.messaging.getMessagesByType('filter-changed');
  const activeFilters = useMemo(() => {
    const filterMessages = messages.filter(msg => msg.content.lifecycle === 'state');
    return filterMessages.length > 0 
      ? filterMessages[filterMessages.length - 1].content.data.filters 
      : [];
  }, [messages]);
  
  // Apply same filtering logic as charts
  const filteredData = useMemo(() => {
    return data.filter(point => {
      return activeFilters.every((filter: any) => {
        const value = point[filter.field as keyof DataPoint];
        switch (filter.operator) {
          case 'equals': return value === filter.value;
          case 'contains': return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'greater': return Number(value) > Number(filter.value);
          case 'less': return Number(value) < Number(filter.value);
          case 'between': return Number(value) >= filter.value[0] && Number(value) <= filter.value[1];
          default: return true;
        }
      });
    });
  }, [data, activeFilters]);
  
  const summary = useMemo(() => {
    return {
      totalPoints: filteredData.length,
      totalValue: filteredData.reduce((sum, point) => sum + point.value, 0),
      averageValue: filteredData.length > 0 ? filteredData.reduce((sum, point) => sum + point.value, 0) / filteredData.length : 0,
      maxValue: Math.max(...filteredData.map(p => p.value)),
      minValue: Math.min(...filteredData.map(p => p.value)),
      categoryCounts: filteredData.reduce((acc, point) => {
        acc[point.category] = (acc[point.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [filteredData]);
  
  return (
    <div className="dashboard-summary">
      <h3>Data Summary</h3>
      
      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-value">{summary.totalPoints}</div>
          <div className="stat-label">Total Records</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{summary.totalValue.toLocaleString()}</div>
          <div className="stat-label">Total Value</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{Math.round(summary.averageValue)}</div>
          <div className="stat-label">Average</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{summary.maxValue}</div>
          <div className="stat-label">Maximum</div>
        </div>
      </div>
      
      <div className="category-breakdown">
        <h4>By Category</h4>
        {Object.entries(summary.categoryCounts).map(([category, count]) => (
          <div key={category} className="category-stat">
            <span className="category-name">{category}</span>
            <span className="category-count">{count}</span>
            <div 
              className="category-bar" 
              style={{ 
                width: `${(count / summary.totalPoints) * 100}%` 
              }}
            />
          </div>
        ))}
      </div>
      
      {activeFilters.length > 0 && (
        <div className="filter-impact">
          <h4>Filter Impact</h4>
          <p>
            Showing {summary.totalPoints} of {data.length} records 
            ({Math.round((summary.totalPoints / data.length) * 100)}%)
          </p>
        </div>
      )}
    </div>
  );
}
```

### Custom Dashboard Plugin

```tsx
// plugins/dashboardPlugin.ts
import { createPlugin } from 'linked-panels';

export const dashboardPlugin = createPlugin({
  name: 'dashboard',
  version: '1.0.0',
  
  messageTypes: {
    'filter-changed': 'filter-changed',
    'chart-point-clicked': 'chart-point-clicked',
    'chart-zoom-changed': 'chart-zoom-changed',
    'data-updated': 'data-updated'
  },
  
  validators: {
    'filter-changed': (content) => {
      return Array.isArray(content.data.filters);
    },
    'chart-point-clicked': (content) => {
      return typeof content.data.chartId === 'string' && 
             typeof content.data.point === 'object';
    },
    'chart-zoom-changed': (content) => {
      return typeof content.data.chartId === 'string' &&
             typeof content.data.range === 'object';
    }
  },
  
  handlers: {
    'filter-changed': (message) => {
      console.log('Filters updated:', message.content.data.filters);
    },
    'chart-point-clicked': (message) => {
      console.log('Chart point clicked:', message.content.data);
    },
    'chart-zoom-changed': (message) => {
      console.log('Chart zoom changed:', message.content.data);
    }
  }
});
```

## Key Features Demonstrated

1. **Synchronized Filtering**: All charts update when filters change
2. **Cross-Panel Communication**: Charts can trigger drill-downs in other panels
3. **Real-time Updates**: Data changes propagate across all visualizations
4. **Persistent State**: Dashboard layout and filters are automatically saved
5. **Interactive Exploration**: Click events trigger related data views
6. **Responsive Design**: Adapts to different screen sizes and panel arrangements

## Advanced Patterns

### Real-time Data Updates

```tsx
// hooks/useRealTimeData.ts
import { useEffect } from 'react';
import { useResourceAPI } from 'linked-panels';

export function useRealTimeData(endpoint: string) {
  const api = useResourceAPI('data-source');
  
  useEffect(() => {
    const eventSource = new EventSource(endpoint);
    
    eventSource.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      
      api.messaging.send('*', {
        type: 'data-updated',
        lifecycle: 'state',
        data: {
          data: newData,
          timestamp: Date.now()
        }
      });
    };
    
    return () => eventSource.close();
  }, [endpoint, api]);
}
```

### Drill-down Navigation

```tsx
// components/DrilldownChart.tsx
export function DrilldownChart({ data, onDrillDown }: DrilldownChartProps) {
  const api = useResourceAPI('drilldown-chart');
  
  const handleBarClick = (category: string) => {
    // Navigate to detailed view
    api.messaging.send('*', {
      type: 'drill-down-requested',
      lifecycle: 'event',
      data: {
        category,
        detailLevel: 'detailed',
        timestamp: Date.now()
      }
    });
  };
  
  // Component implementation...
}
```

This demonstrates how to build sophisticated data dashboards with synchronized charts, interactive filtering, and real-time updates using the Linked Panels library. The system provides a professional analytics experience with minimal code complexity. 