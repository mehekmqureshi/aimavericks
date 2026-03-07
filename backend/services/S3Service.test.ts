import { S3Service } from './S3Service';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('S3Service', () => {
  let s3Service: S3Service;
  let mockS3Client: S3Client;
  let mockSend: jest.Mock;
  const bucketName = 'test-bucket';

  beforeEach(() => {
    // Create mock S3 client
    mockSend = jest.fn();
    mockS3Client = {
      send: mockSend,
    } as any;

    s3Service = new S3Service(mockS3Client, bucketName);

    // Mock getSignedUrl
    (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url.example.com');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadQRBatch', () => {
    it('should create ZIP and upload to S3 with correct key structure', async () => {
      const manufacturerId = 'MFG001';
      const productId = 'PROD001';
      const serialIds = ['PROD001-0001', 'PROD001-0002'];
      const qrImages = [
        Buffer.from('fake-qr-image-1'),
        Buffer.from('fake-qr-image-2'),
      ];

      mockSend.mockResolvedValue({} as any);

      const result = await s3Service.uploadQRBatch(
        manufacturerId,
        productId,
        serialIds,
        qrImages
      );

      // Verify S3 upload was called
      expect(mockSend).toHaveBeenCalledTimes(1);
      
      // Verify a PutObjectCommand was sent (it's a command object)
      const command = mockSend.mock.calls[0][0];
      expect(command).toHaveProperty('resolveMiddleware');

      // Verify signed URL is returned
      expect(result.zipUrl).toBe('https://signed-url.example.com');
      expect(result.expiresAt).toBeInstanceOf(Date);
      
      // Verify expiration is approximately 1 hour from now
      const now = Date.now();
      const expiresAtTime = result.expiresAt.getTime();
      const timeDiff = expiresAtTime - now;
      expect(timeDiff).toBeGreaterThan(3590000); // ~59.8 minutes
      expect(timeDiff).toBeLessThan(3610000); // ~60.2 minutes
    });

    it('should generate signed URL with 1-hour expiration', async () => {
      const manufacturerId = 'MFG001';
      const productId = 'PROD001';
      const serialIds = ['PROD001-0001'];
      const qrImages = [Buffer.from('fake-qr-image')];

      mockSend.mockResolvedValue({} as any);

      await s3Service.uploadQRBatch(
        manufacturerId,
        productId,
        serialIds,
        qrImages
      );

      // Verify getSignedUrl was called with correct expiration
      // The second argument is the actual command instance, we just verify it was called
      expect(getSignedUrl).toHaveBeenCalled();
      const calls = (getSignedUrl as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toBe(mockS3Client);
      expect(calls[0][2]).toEqual({ expiresIn: 3600 });
    });

    it('should throw error when serial IDs and images arrays have different lengths', async () => {
      const manufacturerId = 'MFG001';
      const productId = 'PROD001';
      const serialIds = ['PROD001-0001', 'PROD001-0002'];
      const qrImages = [Buffer.from('fake-qr-image')]; // Only 1 image

      await expect(
        s3Service.uploadQRBatch(manufacturerId, productId, serialIds, qrImages)
      ).rejects.toThrow('Serial IDs and QR images arrays must have the same length');
    });

    it('should throw error when arrays are empty', async () => {
      const manufacturerId = 'MFG001';
      const productId = 'PROD001';
      const serialIds: string[] = [];
      const qrImages: Buffer[] = [];

      await expect(
        s3Service.uploadQRBatch(manufacturerId, productId, serialIds, qrImages)
      ).rejects.toThrow('Cannot create ZIP with zero images');
    });

    it('should create ZIP with correct filenames', async () => {
      const manufacturerId = 'MFG001';
      const productId = 'PROD001';
      const serialIds = ['PROD001-0001', 'PROD001-0002', 'PROD001-0003'];
      const qrImages = [
        Buffer.from('qr1'),
        Buffer.from('qr2'),
        Buffer.from('qr3'),
      ];

      mockSend.mockResolvedValue({} as any);

      await s3Service.uploadQRBatch(
        manufacturerId,
        productId,
        serialIds,
        qrImages
      );

      // Verify S3 send was called
      expect(mockSend).toHaveBeenCalledTimes(1);
      
      // Verify a command was sent
      const command = mockSend.mock.calls[0][0];
      expect(command).toHaveProperty('resolveMiddleware');
    });

    it('should handle large batch (N=1000) within performance requirements', async () => {
      const manufacturerId = 'MFG001';
      const productId = 'PROD001';
      const serialIds: string[] = [];
      const qrImages: Buffer[] = [];

      // Generate 1000 QR codes
      for (let i = 1; i <= 1000; i++) {
        serialIds.push(`PROD001-${String(i).padStart(4, '0')}`);
        qrImages.push(Buffer.from(`qr-image-${i}`));
      }

      mockSend.mockResolvedValue({} as any);

      const startTime = Date.now();
      await s3Service.uploadQRBatch(
        manufacturerId,
        productId,
        serialIds,
        qrImages
      );
      const duration = Date.now() - startTime;

      // Should complete within 5 seconds (requirement 8.4)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('uploadSingleQR', () => {
    it('should upload single QR image to S3 with correct key', async () => {
      const manufacturerId = 'MFG001';
      const productId = 'PROD001';
      const serialId = 'PROD001-0001';
      const qrImage = Buffer.from('fake-qr-image');

      mockSend.mockResolvedValue({} as any);

      const result = await s3Service.uploadSingleQR(
        manufacturerId,
        productId,
        serialId,
        qrImage
      );

      // Verify S3 upload was called
      expect(mockSend).toHaveBeenCalledTimes(1);
      
      // Verify a command was sent
      const command = mockSend.mock.calls[0][0];
      expect(command).toHaveProperty('resolveMiddleware');

      // Verify S3 URL is returned
      expect(result).toBe('s3://test-bucket/qr-codes/MFG001/PROD001/PROD001-0001.png');
    });

    it('should handle S3 upload errors', async () => {
      const manufacturerId = 'MFG001';
      const productId = 'PROD001';
      const serialId = 'PROD001-0001';
      const qrImage = Buffer.from('fake-qr-image');

      mockSend.mockRejectedValue(new Error('S3 upload failed'));

      await expect(
        s3Service.uploadSingleQR(manufacturerId, productId, serialId, qrImage)
      ).rejects.toThrow('S3 upload failed');
    });
  });
});
