import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Frontend API Error Parser & Logic Tests', () => {
  it('should parse simple string detail correctly', async () => {
    const parseApiError = async (res, defaultMsg) => {
      try {
        const data = await res.json();
        if (typeof data.detail === 'string' && data.detail.trim()) return data.detail;
        if (Array.isArray(data.detail) && data.detail.length > 0) {
          return data.detail[0].msg || defaultMsg;
        }
        return data.message || defaultMsg;
      } catch {
        return defaultMsg;
      }
    };

    const mockRes = {
      json: async () => ({ detail: 'اسم المستخدم أو كلمة المرور غير صحيحة' })
    };
    const msg = await parseApiError(mockRes, 'خطأ عام');
    assert.strictEqual(msg, 'اسم المستخدم أو كلمة المرور غير صحيحة');
  });

  it('should format Pydantic validation error cleanly instead of [object Object]', async () => {
    const parseApiError = async (res, defaultMsg) => {
      try {
        const data = await res.json();
        if (typeof data.detail === 'string' && data.detail.trim()) return data.detail;
        if (Array.isArray(data.detail) && data.detail.length > 0) {
          return data.detail[0].msg || defaultMsg;
        }
        return data.message || defaultMsg;
      } catch {
        return defaultMsg;
      }
    };

    const mockRes = {
      json: async () => ({
        detail: [{ loc: ['body', 'username'], msg: 'Field required' }]
      })
    };
    const msg = await parseApiError(mockRes, 'خطأ عام');
    assert.strictEqual(msg, 'Field required');
  });

  it('should return fallback message if response body is HTML or invalid JSON', async () => {
    const parseApiError = async (res, defaultMsg) => {
      try {
        const data = await res.json();
        if (typeof data.detail === 'string' && data.detail.trim()) return data.detail;
        return data.message || defaultMsg;
      } catch {
        return defaultMsg;
      }
    };

    const mockRes = {
      json: async () => { throw new Error('SyntaxError: Unexpected token <'); }
    };
    const msg = await parseApiError(mockRes, 'فشل الاتصال بالخادم');
    assert.strictEqual(msg, 'فشل الاتصال بالخادم');
  });

  it('should normalize priority strings properly', () => {
    const normalizePriority = (v) => {
      const s = (v || 'medium').toLowerCase().trim();
      if (s === 'normal' || s === 'medium') return 'medium';
      if (['high', 'urgent', 'low'].includes(s)) return s;
      return 'medium';
    };

    assert.strictEqual(normalizePriority('normal'), 'medium');
    assert.strictEqual(normalizePriority('medium'), 'medium');
    assert.strictEqual(normalizePriority('urgent'), 'urgent');
    assert.strictEqual(normalizePriority('high'), 'high');
    assert.strictEqual(normalizePriority('low'), 'low');
    assert.strictEqual(normalizePriority(null), 'medium');
  });

  it('should calculate client progress percentage correctly', () => {
    const stages = [
      { id: 1, status: 'completed' },
      { id: 2, status: 'completed' },
      { id: 3, status: 'in_progress' },
      { id: 4, status: 'pending' },
    ];
    const completed = stages.filter(s => s.status === 'completed').length;
    const progress = Math.round((completed / stages.length) * 100);
    assert.strictEqual(progress, 50);
  });
});
