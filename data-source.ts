import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

// Explicit imports – make sure every entity file is here
// If you have more entities (User, Supplier, etc.), add them too!
import { Depart } from 'src/modules/depart/entity/depart.entity';
import { Department } from 'src/modules/department/entity/department.entity';
import { Job } from 'src/modules/job/entity/job.entity';

import { PattyCash } from 'src/modules/pattycash/entity/pattycash.entity';
import { PattycashItem } from 'src/modules/pattycash/entity/pattycash-item.entity';
import { PattycashApproval } from 'src/modules/pattycash/entity/pattycash-approvals.entity';
import { PattycashFile } from 'src/modules/pattycash/entity/pattycash-file.entity';

import { Po } from 'src/modules/po/entity/po.entity';
import { PoItem } from 'src/modules/po/entity/po-item.entity';
import { PoApproval } from 'src/modules/po/entity/po-approvals.entity';
import { PoAttachment } from 'src/modules/po/entity/po-attachment.entity';

import { Pr } from 'src/modules/pr/entity/pr.entity';
import { PrItem } from 'src/modules/pr/entity/pr-item.entity';
import { PrApproval } from 'src/modules/pr/entity/pr-approvals.entity';
import { PrAttachment } from 'src/modules/pr/entity/pr-attachment.entity';

import { Wo } from 'src/modules/wo/entity/wo.entity';
import { WoItem } from 'src/modules/wo/entity/wo-item.entity';
import { WoApproval } from 'src/modules/wo/entity/wo-approval.entity';
import { WoAttachment } from 'src/modules/wo/entity/wo-attachment.entity';

import { Wr } from 'src/modules/wr/entity/wr.entity';
import { WrItem } from 'src/modules/wr/entity/wr-item.entity';
import { WrApproval } from 'src/modules/wr/entity/wr-approval.entity';
import { WrAttachment } from 'src/modules/wr/entity/wr-attachment.entity';

// ← Add any missing entities here if error changes to "metadata not found"

const commonConfig = process.env.DATABASE_URL
  ? {
      type: 'postgres' as const,
      url: process.env.DATABASE_URL,
    }
  : {
      type: 'postgres' as const,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };

export const AppDataSource = new DataSource({
  ...commonConfig,

  // NO GLOB HERE – explicit array only!
  entities: [
    Depart,
    Department,
    Job,
    PattyCash,
    PattycashItem,
    PattycashApproval,
    PattycashFile,
    Po,
    PoItem,
    PoApproval,
    PoAttachment,
    Pr,
    PrItem,
    PrApproval,
    PrAttachment,
    Wo,
    WoItem,
    WoApproval,
    WoAttachment,
    Wr,
    WrItem,
    WrApproval,
    WrAttachment,
    // Add missing ones if any
  ],

  // For migrations: glob is usually safe (migrations rarely circular), but if still error → list files explicitly
  migrations: ['src/migrations/*.ts'],

  synchronize: false,
  logging: ['query', 'error', 'schema', 'migration'], // Keep for debug
});
