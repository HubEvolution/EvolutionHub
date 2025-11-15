import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockLogSecurityEvent = vi.fn();
const mockLogAuthSuccess = vi.fn();
const mockLogAuthFailure = vi.fn();
const mockLogApiAccess = vi.fn();
const mockLogApiError = vi.fn();

vi.mock('@/server/utils/logger-factory', () => {
  return {
    loggerFactory: {
      createSecurityLogger: () => ({
        logSecurityEvent: mockLogSecurityEvent,
        logAuthSuccess: mockLogAuthSuccess,
        logAuthFailure: mockLogAuthFailure,
        logApiAccess: mockLogApiAccess,
        logApiError: mockLogApiError,
      }),
    },
  };
});

import {
  logAuthFailure,
  logAuthSuccess,
  logApiAccess,
  logApiError,
  logMetricCounter,
  logMetricGauge,
  logMetricTiming,
  logSecurityEvent,
} from '@/lib/security-logger';

describe('security-logger helpers', () => {
  beforeEach(() => {
    mockLogSecurityEvent.mockClear();
    mockLogAuthSuccess.mockClear();
    mockLogAuthFailure.mockClear();
    mockLogApiAccess.mockClear();
    mockLogApiError.mockClear();
  });

  it('logAuthFailure merges ipAddress and details', () => {
    logAuthFailure('203.0.113.1', { reason: 'invalid_password', userId: 'user-1' });

    expect(mockLogAuthFailure).toHaveBeenCalledTimes(1);
    const [payload] = mockLogAuthFailure.mock.calls[0];
    expect(payload).toMatchObject({
      ipAddress: '203.0.113.1',
      reason: 'invalid_password',
      userId: 'user-1',
    });
  });

  it('logAuthSuccess merges userId, ipAddress and details', () => {
    logAuthSuccess('user-42', '198.51.100.2', { action: 'login', sessionId: 'sess-1' });

    expect(mockLogAuthSuccess).toHaveBeenCalledTimes(1);
    const [payload] = mockLogAuthSuccess.mock.calls[0];
    expect(payload).toMatchObject({
      userId: 'user-42',
      ipAddress: '198.51.100.2',
      action: 'login',
      sessionId: 'sess-1',
    });
  });

  it('logApiAccess derives targetResource from endpoint/path and fills defaults', () => {
    logApiAccess('user-123', '192.0.2.10', {
      endpoint: '/api/dashboard/projects',
      method: 'GET',
    });

    expect(mockLogApiAccess).toHaveBeenCalledTimes(1);
    const [payload] = mockLogApiAccess.mock.calls[0];
    expect(payload).toMatchObject({
      userId: 'user-123',
      ipAddress: '192.0.2.10',
      targetResource: '/api/dashboard/projects',
      endpoint: '/api/dashboard/projects',
      method: 'GET',
    });
  });

  it('logApiError forwards merged details to SecurityLogger', () => {
    logApiError('/api/test', { reason: 'boom' }, { userId: 'u-1', ipAddress: '203.0.113.10' });

    expect(mockLogApiError).toHaveBeenCalledTimes(1);
    const [payload] = mockLogApiError.mock.calls[0];
    expect(payload).toMatchObject({
      targetResource: '/api/test',
      reason: 'boom',
      userId: 'u-1',
      ipAddress: '203.0.113.10',
    });
  });

  it('logSecurityEvent delegates to SecurityLogger.logSecurityEvent', () => {
    logSecurityEvent('API_ERROR', { reason: 'test' }, { userId: 'u-2' });

    expect(mockLogSecurityEvent).toHaveBeenCalledTimes(1);
    const [type, details] = mockLogSecurityEvent.mock.calls[0];
    expect(type).toBe('API_ERROR');
    expect(details).toMatchObject({
      reason: 'test',
      userId: 'u-2',
    });
  });

  it('metric helpers log METRIC events with expected structure', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    logMetricCounter('contact_form_submit', 1, { locale: 'de' });
    logMetricGauge('active_sessions', 3, { env: 'test' });
    logMetricTiming('request_duration', 42, { path: '/api/foo' });

    expect(mockLogSecurityEvent).toHaveBeenCalledTimes(3);

    const [type1, details1] = mockLogSecurityEvent.mock.calls[0];
    expect(type1).toBe('METRIC');
    expect(details1).toMatchObject({
      metric: {
        kind: 'counter',
        name: 'contact_form_submit',
        value: 1,
        dims: { locale: 'de' },
      },
    });

    const [type2, details2] = mockLogSecurityEvent.mock.calls[1];
    expect(type2).toBe('METRIC');
    expect(details2).toMatchObject({
      metric: {
        kind: 'gauge',
        name: 'active_sessions',
        value: 3,
        dims: { env: 'test' },
      },
    });

    const [type3, details3] = mockLogSecurityEvent.mock.calls[2];
    expect(type3).toBe('METRIC');
    expect(details3).toMatchObject({
      metric: {
        kind: 'timing',
        name: 'request_duration',
        value: 42,
        dims: { path: '/api/foo' },
      },
    });

    nowSpy.mockRestore();
  });
});
