// ormconfig.ts
import { DataSource } from 'typeorm';
import { Wr } from './src/modules/wr/entity/wr.entity';
import { WrApproval } from './src/modules/wr/entity/wr-approval.entity';
import { config } from 'dotenv';
import { User } from './src/modules/users/entity/user.entity';
// เพิ่ม entity อื่น ๆ ถ้ามี

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '425007',
  database: process.env.DB_NAME || 'experteam',
  entities: [User, Wr, WrApproval],
  migrations: ['src/migrations/*.ts'],
  synchronize: true, // ✅ เปิดตอน dev เท่านั้น
  logging: true,
});


config();


