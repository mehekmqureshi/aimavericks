import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import archiver from 'archiver';

/**
 * S3Service handles QR code batch packaging and upload to S3.
 * 
 * Requirements: 10.2, 10.3, 22.2
 */
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(s3Client: S3Client, bucketName: string) {
    this.s3Client = s3Client;
    this.bucketName = bucketName;
  }

  /**
   * Uploads a batch of QR code images as a ZIP file to S3 and generates a signed URL.
   * 
   * @param manufacturerId - The manufacturer identifier
   * @param productId - The product identifier
   * @param serialIds - Array of serial IDs
   * @param qrImages - Array of QR code image buffers
   * @returns Object containing ZIP URL and expiration date
   * 
   * Requirements: 10.2, 10.3, 22.2
   */
  async uploadQRBatch(
    manufacturerId: string,
    productId: string,
    serialIds: string[],
    qrImages: Buffer[]
  ): Promise<{ zipUrl: string; expiresAt: Date }> {
    // Validate inputs
    if (serialIds.length !== qrImages.length) {
      throw new Error('Serial IDs and QR images arrays must have the same length');
    }

    if (serialIds.length === 0) {
      throw new Error('Cannot create ZIP with zero images');
    }

    // Create ZIP archive
    const zipBuffer = await this.createZipArchive(serialIds, qrImages);

    // Generate S3 key with timestamp
    const timestamp = Date.now();
    const s3Key = `qr-codes/${manufacturerId}/${productId}/batch-${timestamp}.zip`;

    // Upload ZIP to S3
    const putCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: zipBuffer,
      ContentType: 'application/zip',
      ServerSideEncryption: 'AES256',
    });

    await this.s3Client.send(putCommand);

    // Generate signed URL with 1-hour expiration for download
    const expiresIn = 3600; // 1 hour in seconds
    const getCommand = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });
    
    const signedUrl = await getSignedUrl(
      this.s3Client,
      getCommand,
      { expiresIn }
    );

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      zipUrl: signedUrl,
      expiresAt,
    };
  }

  /**
   * Creates a ZIP archive from QR code images.
   * 
   * @param serialIds - Array of serial IDs (used for filenames)
   * @param qrImages - Array of QR code image buffers
   * @returns Buffer containing the ZIP archive
   * 
   * Requirements: 10.2
   */
  private async createZipArchive(
    serialIds: string[],
    qrImages: Buffer[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
      });

      const chunks: Buffer[] = [];

      // Collect ZIP data chunks
      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      // Handle completion
      archive.on('end', () => {
        const zipBuffer = Buffer.concat(chunks);
        resolve(zipBuffer);
      });

      // Handle errors
      archive.on('error', (err: Error) => {
        reject(new Error(`Failed to create ZIP archive: ${err.message}`));
      });

      // Add each QR image to the archive
      for (let i = 0; i < serialIds.length; i++) {
        const serialId = serialIds[i];
        const qrImage = qrImages[i];
        const filename = `${serialId}.png`;

        // Add buffer as a file in the ZIP
        archive.append(qrImage, { name: filename });
      }

      // Finalize the archive
      archive.finalize();
    });
  }

  /**
   * Uploads a single QR code image to S3.
   * 
   * @param manufacturerId - The manufacturer identifier
   * @param productId - The product identifier
   * @param serialId - The serial identifier
   * @param qrImage - QR code image buffer
   * @returns S3 URL of the uploaded image
   * 
   * Requirements: 22.2
   */
  async uploadSingleQR(
    manufacturerId: string,
    productId: string,
    serialId: string,
    qrImage: Buffer
  ): Promise<string> {
    const s3Key = `qr-codes/${manufacturerId}/${productId}/${serialId}.png`;

    const putCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: qrImage,
      ContentType: 'image/png',
      ServerSideEncryption: 'AES256',
    });

    await this.s3Client.send(putCommand);

    // Return the S3 URL (not signed, for internal storage reference)
    return `s3://${this.bucketName}/${s3Key}`;
  }
}
