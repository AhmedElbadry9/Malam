import React from 'react';
import { Badge } from './Badge';

interface PriorityBadgeProps {
  priority: 'urgent' | 'high' | 'medium' | 'low' | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'sm', className = '' }) => {
  switch (priority) {
    case 'urgent':
      return (
        <Badge variant="danger" size={size} dot className={`border-rose-500/40 font-black ${className}`}>
          طارئ جداً
        </Badge>
      );
    case 'high':
      return (
        <Badge variant="warning" size={size} dot className={className}>
          أولوية عالية
        </Badge>
      );
    case 'medium':
      return (
        <Badge variant="primary" size={size} className={className}>
          متوسط
        </Badge>
      );
    case 'low':
      return (
        <Badge variant="neutral" size={size} className={className}>
          منخفض
        </Badge>
      );
    default:
      return (
        <Badge variant="default" size={size} className={className}>
          {priority}
        </Badge>
      );
  }
};
