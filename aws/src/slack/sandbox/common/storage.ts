import { TinyStorage } from '@/lib/aws/dynamodb/tiny-storage';

type StorageContent = {
  lastDumpedTimeStamp: string;
};

export const storage = new TinyStorage<StorageContent>('sandbox-keeper');
