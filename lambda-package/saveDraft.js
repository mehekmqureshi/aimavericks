"use strict";
/**
 * SaveDraft Lambda Handler
 *
 * Saves partial lifecycle data as a draft for later completion.
 * Allows manufacturers to save progress on product creation.
 *
 * Requirements: 3.1.6
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const crypto_1 = require("crypto");
// Initialize DynamoDB client
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const DRAFTS_TABLE = process.env.DRAFTS_TABLE || 'Drafts';
/**
 * Lambda handler for saving a draft
 *
 * Flow:
 * 1. Parse request body with partial lifecycle data
 * 2. Extract manufacturerId from JWT token
 * 3. Store draft data in DynamoDB with draftId
 * 4. Return draftId and timestamp
 *
 * @param event - API Gateway event with draft data
 * @returns API Gateway response with draftId and timestamp
 */
const handler = async (event) => {
    const requestId = event.requestContext.requestId;
    try {
        // Step 1: Parse request body
        if (!event.body) {
            return createErrorResponse(400, 'MISSING_BODY', 'Request body is required', requestId);
        }
        let requestBody;
        try {
            requestBody = JSON.parse(event.body);
        }
        catch (error) {
            return createErrorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON', requestId);
        }
        // Validate that at least some data is provided
        if (!requestBody.name && !requestBody.description && !requestBody.category && !requestBody.lifecycleData) {
            return createErrorResponse(400, 'VALIDATION_ERROR', 'At least one field must be provided to save a draft', requestId);
        }
        // Step 2: Extract manufacturerId from JWT token
        const manufacturerId = extractManufacturerId(event);
        if (!manufacturerId) {
            return createErrorResponse(401, 'UNAUTHORIZED', 'Invalid or missing authentication token', requestId);
        }
        // Step 3: Store draft data in DynamoDB
        const draftId = `DRAFT-${(0, crypto_1.randomUUID)()}`;
        const now = new Date().toISOString();
        const draftItem = {
            draftId,
            manufacturerId,
            name: requestBody.name,
            description: requestBody.description,
            category: requestBody.category,
            lifecycleData: requestBody.lifecycleData,
            savedAt: now,
            updatedAt: now,
        };
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: DRAFTS_TABLE,
            Item: draftItem,
        }));
        // Step 4: Return draftId and timestamp
        const response = {
            draftId,
            savedAt: now,
        };
        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        console.error('Error saving draft:', error);
        return createErrorResponse(500, 'INTERNAL_ERROR', 'An error occurred while saving the draft', requestId, error instanceof Error ? error.message : 'Unknown error');
    }
};
exports.handler = handler;
/**
 * Extract manufacturerId from JWT token in Authorization header
 *
 * In API Gateway with JWT authorizer, the claims are available in:
 * event.requestContext.authorizer.claims
 */
function extractManufacturerId(event) {
    try {
        // JWT authorizer puts claims in requestContext.authorizer
        const claims = event.requestContext.authorizer?.claims;
        // Use sub claim (Cognito user ID) as manufacturerId
        if (claims && claims.sub) {
            return claims.sub;
        }
        return null;
    }
    catch (error) {
        console.error('Error extracting manufacturerId:', error);
        return null;
    }
}
/**
 * Create standardized error response
 */
function createErrorResponse(statusCode, code, message, requestId, details) {
    const errorResponse = {
        error: {
            code,
            message,
            details,
            timestamp: new Date().toISOString(),
            requestId,
        },
    };
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(errorResponse),
    };
}
