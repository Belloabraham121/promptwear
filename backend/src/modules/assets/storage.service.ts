import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const DEFAULT_UPLOAD_TTL_SECONDS = 900;
const DEFAULT_DOWNLOAD_TTL_SECONDS = 900;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.getOrThrow<string>('s3.endpoint');
    const region = this.configService.getOrThrow<string>('s3.region');
    const accessKeyId = this.configService.getOrThrow<string>('s3.accessKeyId');
    const secretAccessKey = this.configService.getOrThrow<string>(
      's3.secretAccessKey',
    );
    const forcePathStyle = this.configService.getOrThrow<boolean>(
      's3.forcePathStyle',
    );

    this.bucket = this.configService.getOrThrow<string>('s3.bucket');
    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucket();
  }

  private async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return;
    } catch {
      // Bucket missing or unreachable — try create.
    }

    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Created S3 bucket "${this.bucket}"`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Race: another process created it first.
      if (/BucketAlreadyOwnedByYou|BucketAlreadyExists|already own/i.test(message)) {
        return;
      }
      this.logger.warn(
        `Could not ensure S3 bucket "${this.bucket}": ${message}. Run: npm run docker:up`,
      );
    }
  }

  buildStorageKey(userId: string, assetId: string, fileName: string): string {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `users/${userId}/assets/${assetId}/${safeName}`;
  }

  async createPresignedUploadUrl(
    storageKey: string,
    mime: string,
    expiresIn = DEFAULT_UPLOAD_TTL_SECONDS,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: mime,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async createPresignedDownloadUrl(
    storageKey: string,
    expiresIn = DEFAULT_DOWNLOAD_TTL_SECONDS,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async headObject(
    storageKey: string,
  ): Promise<{ sizeBytes?: number; contentType?: string }> {
    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );

    return {
      sizeBytes: response.ContentLength,
      contentType: response.ContentType,
    };
  }

  async putObject(
    storageKey: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async deleteObject(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );
  }
}
