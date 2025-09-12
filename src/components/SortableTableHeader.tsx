import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface SortConfig {
  key: string | null;
  direction: 'asc' | 'desc' | null;
}

interface SortableTableHeaderProps {
  children: React.ReactNode;
  sortKey: string;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export const SortableTableHeader: React.FC<SortableTableHeaderProps> = ({
  children,
  sortKey,
  sortConfig,
  onSort,
  className,
  align = 'left'
}) => {
  const isActive = sortConfig.key === sortKey;
  const direction = isActive ? sortConfig.direction : null;

  const getSortIcon = () => {
    if (!isActive || direction === null) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    
    if (direction === 'asc') {
      return <ArrowUp className="w-4 h-4 text-blue-600" />;
    }
    
    return <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  return (
    <TableHead className={cn('p-0', className)}>
      <Button
        variant="ghost"
        className={cn(
          'h-full w-full font-medium text-gray-600 hover:text-gray-900 px-3 py-2',
          'justify-start gap-2 hover:bg-gray-50 rounded-none',
          {
            'justify-center': align === 'center',
            'justify-end': align === 'right',
          },
          isActive && 'text-blue-600'
        )}
        onClick={() => onSort(sortKey)}
      >
        <span className="truncate">{children}</span>
        {getSortIcon()}
      </Button>
    </TableHead>
  );
};
// Hook for managing sort state
export const useSortable = (initialSort?: { key: string; direction: 'asc' | 'desc' }) => {
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    key: initialSort?.key || null,
    direction: initialSort?.direction || null,
  });

  const handleSort = React.useCallback((key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        // Same key, toggle direction
        if (prevConfig.direction === 'asc') {
          return { key, direction: 'desc' };
        } else if (prevConfig.direction === 'desc') {
          return { key: null, direction: null }; // Reset to no sort
        }
      }
      // New key or no current sort
      return { key, direction: 'asc' };
    });
  }, []);

  const resetSort = React.useCallback(() => {
    setSortConfig({ key: null, direction: null });
  }, []);

  return {
    sortConfig,
    handleSort,
    resetSort,
    setSortConfig,
  };
};

