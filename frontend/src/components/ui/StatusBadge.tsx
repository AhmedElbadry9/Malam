import React from 'react';
import { Badge } from './Badge';

export type TaskOrClientStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'under_review' 
  | 'revision_requested' 
  | 'completed'
  | 'intake'
  | 'review'
  | string;

interface StatusBadgeProps {
  status: TaskOrClientStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className = '' }) => {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="neutral" size={size} dot className={className}>
          قيد الانتظار
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="info" size={size} dot className={className}>
          قيد التنفيذ
        </Badge>
      );
    case 'under_review':
    case 'review':
      return (
        <Badge variant="warning" size={size} dot className={`animate-pulse ${className}`}>
          قيد المراجعة
        </Badge>
      );
    case 'revision_requested':
      return (
        <Badge variant="danger" size={size} dot className={className}>
          مطلوب تعديلات
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="success" size={size} dot className={className}>
          مكتمل
        </Badge>
      );
    case 'intake':
      return (
        <Badge variant="primary" size={size} dot className={className}>
          استلام جديد
        </Badge>
      );
    default:
      return (
        <Badge variant="default" size={size} className={className}>
          {status}
        </Badge>
      );
  }
};
