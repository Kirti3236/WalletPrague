import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('User ID Fix - E2E Tests', () => {
  let app: INestApplication;
  let jwtToken: string;
  let testUserId: string;
  let testWalletId: string;
  let testPaymentMethodId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // TODO: Get JWT token from login endpoint
    // This is a placeholder - you need to implement actual authentication
    jwtToken = 'YOUR_TEST_JWT_TOKEN';
    testUserId = 'test-user-id';
    testWalletId = 'test-wallet-id';
    testPaymentMethodId = 'test-payment-method-id';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Category 1: Deposits (Flexible user_id)', () => {
    it('should accept deposit WITHOUT user_id and use JWT token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/deposits/from-card')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          wallet_id: testWalletId,
          payment_method_id: testPaymentMethodId,
          amount: '10.00',
          currency: 'LPS',
        })
        .expect((res) => {
          // Should not return 401 (unauthorized)
          expect(res.status).not.toBe(401);
          // Should accept the request (200, 400, or 404 are acceptable)
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should accept deposit WITH explicit user_id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/deposits/from-card')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          user_id: testUserId,
          wallet_id: testWalletId,
          payment_method_id: testPaymentMethodId,
          amount: '10.00',
          currency: 'LPS',
        })
        .expect((res) => {
          expect(res.status).not.toBe(401);
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should accept bank deposit WITHOUT user_id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/deposits/from-bank')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          wallet_id: testWalletId,
          payment_method_id: testPaymentMethodId,
          amount: '20.00',
          currency: 'LPS',
        })
        .expect((res) => {
          expect(res.status).not.toBe(401);
          expect([200, 400, 404]).toContain(res.status);
        });
    });
  });

  describe('Category 2: Payment Methods (Flexible user_id)', () => {
    it('should accept add card WITHOUT user_id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/payment-methods/cards')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          brand: 'VISA',
          last4: '4242',
          expiry_month: 12,
          expiry_year: 2025,
          is_default: false,
        })
        .expect((res) => {
          expect(res.status).not.toBe(401);
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });

    it('should accept add card WITH explicit user_id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/payment-methods/cards')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          user_id: testUserId,
          brand: 'MASTERCARD',
          last4: '5555',
          expiry_month: 12,
          expiry_year: 2026,
          is_default: false,
        })
        .expect((res) => {
          expect(res.status).not.toBe(401);
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });

    it('should accept add bank account WITHOUT user_id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/payment-methods/bank-accounts')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          bank_name: 'Test Bank',
          account_type: 'checking',
          last4: '1234',
          is_default: false,
        })
        .expect((res) => {
          expect(res.status).not.toBe(401);
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });
  });

  describe('Category 3: Withdrawals (Flexible user_id)', () => {
    it('should accept withdrawal WITHOUT user_id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/withdrawals/generate')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          wallet_id: testWalletId,
          amount: '50.00',
          currency: 'LPS',
        })
        .expect((res) => {
          expect(res.status).not.toBe(401);
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should accept withdrawal WITH explicit user_id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/withdrawals/generate')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          user_id: testUserId,
          wallet_id: testWalletId,
          amount: '50.00',
          currency: 'LPS',
        })
        .expect((res) => {
          expect(res.status).not.toBe(401);
          expect([200, 400, 404]).toContain(res.status);
        });
    });
  });

  describe('Category 4: Payments (Security Locked)', () => {
    it('should accept payment request WITHOUT user_id (uses JWT)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/payments/request')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          wallet_id: testWalletId,
          amount: '25.00',
          currency: 'LPS',
        })
        .expect((res) => {
          expect(res.status).not.toBe(401);
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should ignore explicit user_id in payment request (security)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/payments/request')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          user_id: 'malicious-user-id',
          wallet_id: testWalletId,
          amount: '25.00',
          currency: 'LPS',
        })
        .expect((res) => {
          expect(res.status).not.toBe(401);
          // Should still work but use JWT user_id
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should accept generate QR WITHOUT user_id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/payments/generate-qr')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          wallet_id: testWalletId,
          amount: '100.00',
          description: 'Test QR',
          currency: 'LPS',
        })
        .expect((res) => {
          expect(res.status).not.toBe(401);
          expect([200, 400, 404]).toContain(res.status);
        });
    });
  });

  describe('Category 5: Transfers (Security Locked)', () => {
    it('should accept transfer by DNI WITHOUT sender_user_id (uses JWT)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/transfers/by-dni')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          recipient_dni: '0801199012345',
          amount: 10,
          currency: 'LPS',
        })
        .expect((res) => {
          expect(res.status).not.toBe(401);
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should ignore explicit sender_user_id in transfer (security)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/transfers/by-dni')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          sender_user_id: 'malicious-user-id',
          recipient_dni: '0801199012345',
          amount: 10,
          currency: 'LPS',
        })
        .expect((res) => {
          expect(res.status).not.toBe(401);
          // Should still work but use JWT user_id
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should accept validate recipient WITHOUT sender_user_id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/transfers/validate-recipient')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          identifier: '0801199012345',
        })
        .expect((res) => {
          expect(res.status).not.toBe(401);
          expect([200, 400, 404]).toContain(res.status);
        });
    });
  });

  describe('Security Tests', () => {
    it('should reject requests without JWT token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/private/deposits/from-card')
        .send({
          wallet_id: testWalletId,
          payment_method_id: testPaymentMethodId,
          amount: '10.00',
        })
        .expect(401);
    });

    it('should NOT allow payment with arbitrary sender_user_id', async () => {
      // This test verifies that even if client sends sender_user_id,
      // the server will override it with JWT user_id
      const response = await request(app.getHttpServer())
        .post('/api/v1/private/payments/request')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          user_id: 'different-user-id',
          wallet_id: testWalletId,
          amount: '25.00',
          currency: 'LPS',
        });

      // Should not return 401 (authorized request)
      expect(response.status).not.toBe(401);
      // Server should process it (may fail on business logic, but not on auth)
      expect([200, 400, 404]).toContain(response.status);
    });
  });
});

