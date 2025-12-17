import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { VersioningType } from '@nestjs/common';

async function exportOpenApi() {
	try {
		console.log('🚀 Initializing NestJS application...');
		
		// Set minimal environment variables if not set
		if (!process.env.NODE_ENV) {
			process.env.NODE_ENV = 'development';
		}
		if (!process.env.SWAGGER_ENABLED) {
			process.env.SWAGGER_ENABLED = 'true';
		}
		
		// Disable database sync for OpenAPI export (we don't need DB for route discovery)
		process.env.DB_SYNC = 'false';
		
		console.log('⚠️  Note: Database connection may fail, but this is OK for OpenAPI generation');
		
		const app = await NestFactory.create(AppModule, { 
			logger: false, // Disable all logging to avoid database errors
			abortOnError: false, // Don't abort on errors during initialization
		});
		
		const configService = app.get(ConfigService);

		const port = configService.get('app.port') || 3000;
		let apiVersionNumber = configService.get('app.apiVersion') || '1';
		// Clean version number
		apiVersionNumber = apiVersionNumber.replace(/^v/i, '');
		const apiVersion = `v${apiVersionNumber}`;

		console.log(`📋 API Version: ${apiVersion}`);

		// Ensure versioned routes in the generated OpenAPI
		app.enableVersioning({
			type: VersioningType.URI,
			defaultVersion: apiVersionNumber,
		});

	const swaggerConfig = new DocumentBuilder()
		.setTitle('YaPague! Payment Management System API')
		.setDescription(`\n## 🏗️ API Architecture Overview\n\n### 📍 Route Structure\nThe API follows a clean approach with **public** and **private** route categories:\n\n- **🌐 Public Routes**: /${apiVersion}/public/* - No authentication required\n- **🔐 Private Routes**: /${apiVersion}/private/* - JWT authentication required\n\n### 🔐 Authentication Guide\n\n**For Private Endpoints:**\n1. First, login using POST /${apiVersion}/public/auth/login\n2. Copy the JWT token from response\n3. Click the 🔓 Authorize button above\n4. Enter: Bearer <your-jwt-token>\n5. Click Authorize to enable access to private endpoints\n`)
		.setVersion('1.0')
		.addServer(`http://localhost:${port}`, 'Development server')
		.addBearerAuth(
			{
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
				name: 'JWT',
				description: 'Enter JWT token obtained from login endpoint',
				in: 'header',
			},
			'JWT-auth',
		)
		.addTag('🌐 Authentication', 'Public authentication endpoints (no token required)')
		.addTag('🔐 Users', 'Private user management endpoints (JWT token required)')
		.addTag('🔐 Wallets', 'Wallet overview and balances')
		.addTag('🔐 Payment Methods', 'Cards and bank accounts (mock)')
		.addTag('🔐 Deposits', 'Deposit funds from card or bank (mock)')
		.addTag('🔐 Payments', 'Payment requests, QR codes and redemptions (mock)')
		.addTag('🔐 Withdrawals', 'Withdraw funds (mock)')
		.addTag('🔐 Transfers', 'Peer-to-peer transfers')
		.addTag('🔐 Transactions', 'Transaction history and search')
		.addTag('📊 Transaction Status', 'Transaction status and catalog endpoints')
		.addTag('📊 Admin Transaction Status', 'Admin transaction status management')
		.addTag('banks', 'Public bank directory lookups')
		.addTag('🔐 Audit Logs & Compliance', 'Admin audit logs and compliance tracking')
		.addTag('🔐 Personal Audit Trail', 'User personal audit trail')
		.addTag('📊 Accounting & Double-Entry Bookkeeping', 'Double-entry accounting system')
		.addTag('💼 Disputes & Chargebacks', 'User dispute management')
		.addTag('💼 Admin Disputes', 'Admin dispute management')
		.addTag('🔔 Webhooks', 'Webhook management and configuration')
		.addTag('💸 Settlements', 'Settlement management')
		.addTag('💰 Fees', 'Fee management')
		.addTag('💰 Admin Fee Management', 'Admin fee policy management')
		.addTag('🔄 Bank Reconciliation', 'Bank reconciliation operations')
		.addTag('🏦 Bank Reconciliation', 'Bank reconciliation management')
		.addTag('💸 Refund Management', 'Refund request management')
		.addTag('💰 Admin Limit Management', 'Admin limit policy management')
		.addTag('💰 User Account Limits', 'User account limit checks')
		.addTag('💰 User Limits & Risk Management', 'User limits and risk management')
		.addTag('Risk Management', 'Risk evaluation and management')
		.addTag('AML/Fraud Alerts', 'AML and fraud alert management')
		.addTag('🛡️ User AML Status', 'User AML status checks')
		.addTag('Dashboard', 'Dashboard metrics and analytics')
		.addTag('Reports', 'Financial and compliance reports')
		.addTag('📋 Statements', 'User statements and exports')
		.addTag('🔒 Restrictions', 'User restrictions management')
		.build();

		console.log('📝 Generating OpenAPI document...');
		const document = SwaggerModule.createDocument(app, swaggerConfig);

		// Count paths and tags
		const pathCount = Object.keys(document.paths || {}).length;
		const tags = new Set<string>();
		Object.values(document.paths || {}).forEach((path: any) => {
			Object.values(path).forEach((op: any) => {
				if (op.tags) {
					op.tags.forEach((tag: string) => tags.add(tag));
				}
			});
		});

		const outDir = join(process.cwd(), 'docs', 'postman');
		mkdirSync(outDir, { recursive: true });
		const outFile = join(outDir, 'openapi.json');
		writeFileSync(outFile, JSON.stringify(document, null, 2));
		
		console.log(`✅ OpenAPI JSON exported to ${outFile}`);
		console.log(`📊 Total paths: ${pathCount}`);
		console.log(`📁 Total tags: ${tags.size}`);
		console.log(`🏷️  Tags: ${Array.from(tags).sort().join(', ')}`);
		
		await app.close();
	} catch (err: any) {
		console.error('❌ Failed to export OpenAPI spec:');
		console.error('Error:', err.message);
		if (err.stack) {
			console.error('Stack:', err.stack);
		}
		process.exit(1);
	}
}

exportOpenApi().catch((err) => {
	console.error('❌ Fatal error:', err);
	process.exit(1);
});
