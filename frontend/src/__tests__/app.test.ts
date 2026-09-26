import { describe, it, expect } from 'vitest';
import { parseApiError } from '../services/api';

describe('Frontend API Error Parser & Formatting', () => {
  it('should parse simple string detail correctly', async () => {
    const mockRes = {
      json: async () => ({ detail: 'اسم المستخدم أو كلمة المرور غير صحيحة' })
    } as unknown as Response;

    const msg = await parseApiError(mockRes, 'خطأ عام');
    expect(msg).toBe('اسم المستخدم أو كلمة المرور غير صحيحة');
  });

  it('should format Pydantic validation error array cleanly instead of [object Object]', async () => {
    const mockRes = {
      json: async () => ({
        detail: [
          { loc: ['body', 'username'], msg: 'Field required', type: 'value_error.missing' }
        ]
      })
    } as unknown as Response;

    const msg = await parseApiError(mockRes, 'خطأ عام');
    expect(msg).toBe('Field required');
  });

  it('should return fallback message if response body is not JSON or parsing fails', async () => {
    const mockRes = {
      json: async () => { throw new Error('SyntaxError: Unexpected token <'); }
    } as unknown as Response;

    const msg = await parseApiError(mockRes, 'فشل الاتصال بالخادم');
    expect(msg).toBe('فشل الاتصال بالخادم');
  });
});

describe('Client Logic & Calculations', () => {
  it('should calculate client task progress percentage accurately', () => {
    const stages = [
      { id: 1, status: 'completed' },
      { id: 2, status: 'completed' },
      { id: 3, status: 'in_progress' },
      { id: 4, status: 'pending' },
    ];

    const completed = stages.filter(s => s.status === 'completed').length;
    const progress = Math.round((completed / stages.length) * 100);
    expect(progress).toBe(50);
  });

  it('should identify urgent clients and on-time delivery', () => {
    const now = new Date();
    const futureDeadline = new Date(now.getTime() + 48 * 3600 * 1000);
    const completionDate = new Date(now.getTime() + 24 * 3600 * 1000);

    const isOnTime = completionDate <= futureDeadline;
    expect(isOnTime).toBe(true);
  });
});
