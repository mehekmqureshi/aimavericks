/**
 * Simple Lambda test to debug issues
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

async function testCreateProduct() {
  const client = new LambdaClient({ region: 'us-east-1' });
  
  const payload = {
    requestContext: {
      requestId: 'test-request-' + Date.now(),
      authorizer: {
        claims: {
          sub: 'MFG001',
          'custom:manufacturerId': 'MFG001'
        }
      }
    },
    body: JSON.stringify({
      name: 'Simple Test Product',
      description: 'Testing',
      category: 'Test',
      manufacturerId: 'MFG001',
      lifecycleData: {
        materials: [{
          name: 'Cotton',
          percentage: 100,
          weight: 0.1,
          emissionFactor: 2.0,
          countryOfOrigin: 'India',
          recycled: false,
          calculatedEmission: 0.2
        }],
        manufacturing: {
          factoryLocation: 'Test',
          energyConsumption: 1,
          energyEmissionFactor: 0.5,
          dyeingMethod: 'Test',
          waterConsumption: 10,
          wasteGenerated: 0.01,
          calculatedEmission: 0.5
        },
        packaging: {
          materialType: 'Cardboard',
          weight: 0.05,
          emissionFactor: 0.9,
          recyclable: true,
          calculatedEmission: 0.045
        },
        transport: {
          mode: 'Ship',
          distance: 1000,
          fuelType: 'Diesel',
          emissionFactorPerKm: 0.01,
          calculatedEmission: 10
        },
        usage: {
          avgWashCycles: 50,
          washTemperature: 30,
          dryerUse: false,
          calculatedEmission: 5
        },
        endOfLife: {
          recyclable: true,
          biodegradable: false,
          takebackProgram: false,
          disposalEmission: 0.5
        }
      }
    })
  };

  console.log('Invoking Lambda...');
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const command = new InvokeCommand({
    FunctionName: 'gp-createProduct-dev',
    Payload: JSON.stringify(payload)
  });

  const response = await client.send(command);
  
  console.log('\nResponse:');
  console.log('StatusCode:', response.StatusCode);
  console.log('FunctionError:', response.FunctionError);
  
  if (response.Payload) {
    const payloadStr = new TextDecoder().decode(response.Payload);
    console.log('Payload:', payloadStr);
    
    try {
      const parsed = JSON.parse(payloadStr);
      console.log('Parsed:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Could not parse payload as JSON');
    }
  }
}

testCreateProduct().catch(console.error);
