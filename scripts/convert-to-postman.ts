import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { convert } from 'openapi-to-postmanv2';

async function convertToPostman() {
  const openApiPath = join(process.cwd(), 'docs', 'postman', 'openapi.json');
  const outputPath = join(process.cwd(), 'docs', 'postman', 'YaPague.postman_collection.json');
  
  try {
    console.log('📖 Reading OpenAPI specification...');
    const openApiSpec = JSON.parse(readFileSync(openApiPath, 'utf8'));
    
    console.log('🔄 Converting OpenAPI to Postman collection...');
    
    // Use callback-based API
    return new Promise<void>((resolve, reject) => {
      convert({
        type: 'string',
        data: JSON.stringify(openApiSpec),
      }, {
        folderStrategy: 'Tags',
        requestParametersResolution: 'Example',
        exampleParametersResolution: 'Example',
        schemaFolding: false,
        includeAuthInfoInExample: true,
        stackLimit: 50,
        requestNameSource: 'Fallback',
        responseNameSource: 'StatusCode',
        enableOptionalParameters: true,
      }, (err: any, result: any) => {
        if (err) {
          console.error('❌ Conversion failed:', err.message || err);
          reject(err);
          return;
        }
        
        if (!result.result) {
          console.error('❌ Conversion failed:', result.reason);
          if (result.output) {
            console.error('Conversion output:', JSON.stringify(result.output, null, 2));
          }
          reject(new Error(result.reason || 'Conversion failed'));
          return;
        }
        
        const collection = result.output[0].data;
      
      // Enhance collection with better metadata
      collection.info = {
        ...collection.info,
        name: 'YaPague! Payment Management System API',
        description: {
          content: `\n## 🏗️ API Architecture Overview\n\n### 📍 Route Structure\nThe API follows a clean approach with **public** and **private** route categories:\n\n- **🌐 Public Routes**: /v1/public/* - No authentication required\n- **🔐 Private Routes**: /v1/private/* - JWT authentication required\n\n### 🔐 Authentication Guide\n\n**For Private Endpoints:**\n1. First, login using POST /v1/public/auth/login\n2. Copy the JWT token from response\n3. Set the \`jwt\` variable in the environment\n4. The collection will automatically use the token for authenticated requests\n\n### 📊 Endpoint Categories\n\n#### 🌐 Public Routes (No Auth Required)\n- User registration and authentication\n- Password recovery flows\n- Public information endpoints\n\n#### 🔐 Private Routes (JWT Required)\n- User profile management\n- Account operations\n- Protected data access\n\n**Icon Legend:**\n- 🌐 = Public/Global endpoints\n- 🔐 = Private/Secured endpoints\n- 📊 = Admin/Reporting endpoints\n- 💰 = Financial/Limit endpoints\n- 💼 = Dispute/Compliance endpoints\n`,
          type: 'text/markdown',
        },
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      };
      
      // Add collection variables if not present
      if (!collection.variable) {
        collection.variable = [];
      }
      
      // Ensure baseUrl variable exists
      const baseUrlVar = collection.variable.find((v: any) => v.key === 'baseUrl');
      if (!baseUrlVar) {
        collection.variable.push({
          key: 'baseUrl',
          value: 'http://localhost:3000',
          type: 'string',
        });
      }
      
      // Add Idempotency-Key helper variable
      const idempotencyKeyVar = collection.variable.find((v: any) => v.key === 'idempotencyKey');
      if (!idempotencyKeyVar) {
        collection.variable.push({
          key: 'idempotencyKey',
          value: '{{$guid}}',
          type: 'string',
        });
      }
      
        writeFileSync(outputPath, JSON.stringify(collection, null, 2));
        console.log(`✅ Postman collection exported to ${outputPath}`);
        console.log(`📦 Collection contains ${collection.item?.length || 0} top-level folders`);
        resolve();
      });
    });
  } catch (error: any) {
    console.error('❌ Failed to convert OpenAPI to Postman:', error.message || error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

convertToPostman().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});

