// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER } from '@nestjs/core';
import { DataSource, DataSourceOptions } from 'typeorm';

// ✅ Import Exception Filter

// Modules
import { PrModule } from './modules/pr/pr.module';
import { PoModule } from './modules/po/po.module';
import { WrModule } from './modules/wr/wr.module';
import { WoModule } from './modules/wo/wo.module';
import { JobModule } from './modules/job/job.module';
import { TraderModule } from './modules/trader/trader.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentModule } from './modules/department/department.module';
import { PattycashModule } from './modules/pattycash/pattycash.module';
import { Depart } from './modules/depart/entity/depart.entity';

// Entities
import { Trader } from './modules/trader/entity/trader.entity';
import { Supplier } from './modules/supplier/entity/supplier.entity';
import { User } from './modules/users/entity/user.entity';
import { Job } from './modules/job/entity/job.entity';
import { Pr } from './modules/pr/entity/pr.entity';
import { PrItem } from './modules/pr/entity/pr-item.entity';
import { PrApproval } from './modules/pr/entity/pr-approvals.entity';
import { Po } from './modules/po/entity/po.entity';
import { PoItem } from './modules/po/entity/po-item.entity';
import { PoApproval } from './modules/po/entity/po-approvals.entity';
import { PoAttachment } from './modules/po/entity/po-attachment.entity';
import { Wr } from './modules/wr/entity/wr.entity';
import { WrItem } from './modules/wr/entity/wr-item.entity';
import { WrApproval } from './modules/wr/entity/wr-approval.entity';
import { WrAttachment } from './modules/wr/entity/wr-attachment.entity';
import { Wo } from './modules/wo/entity/wo.entity';
import { WoItem } from './modules/wo/entity/wo-item.entity';
import { WoApproval } from './modules/wo/entity/wo-approval.entity';
import { WoAttachment } from './modules/wo/entity/wo-attachment.entity';
import { PattyCash } from './modules/pattycash/entity/pattycash.entity';
import { PattycashItem } from './modules/pattycash/entity/pattycash-item.entity';
import { PattycashApproval } from './modules/pattycash/entity/pattycash-approvals.entity';
import { Department } from './modules/department/entity/department.entity';
import { DepartModule } from './modules/depart/depart.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrAttachment } from './modules/pr/entity/pr-attachment.entity';
import { PattycashFile } from './modules/pattycash/entity/pattycash-file.entity';

declare global {
  var __typeorm_global_cache__: { dataSource?: DataSource } | undefined;
}

const globalCache = global as unknown as { __typeorm_global_cache__: { dataSource?: DataSource } };

if (!globalCache.__typeorm_global_cache__) {
  globalCache.__typeorm_global_cache__ = {};
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function databaseConfig(): DataSourceOptions {
  if (process.env.DATABASE_URL) {
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
    };
  }

  return {
    type: 'postgres',
    host: requireEnv('DB_HOST'),
    port: Number(requireEnv('DB_PORT')),
    username: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    database: requireEnv('DB_NAME'),
  };
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const config: DataSourceOptions = {
          ...databaseConfig(),

          entities: [
            Pr, PrItem, PrApproval,
            Po, PoItem, PoApproval, PoAttachment, PrAttachment,
            Wr, WrItem, WrApproval, WrAttachment,
            Wo, WoItem, WoApproval, WoAttachment,
            PattyCash, PattycashItem, PattycashApproval, PattycashFile,
            Trader, Supplier, User, Job, Depart, Department,
          ],
           
          synchronize: false,
          migrations: ['dist/migrations/*.js'],
          migrationsRun: process.env.NODE_ENV === 'production',

          logging: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'info'] : false,

          // Pool settings
          extra: {
            max: process.env.NODE_ENV === 'development' ? 5 : 20,
            min: 1,
            idleTimeoutMillis: process.env.NODE_ENV === 'development' ? 10000 : 30000,
            connectionTimeoutMillis: 5000,
          },
        };

        return config;
      },
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('TypeORM options are undefined in dataSourceFactory');
        }

        if (globalCache.__typeorm_global_cache__.dataSource?.isInitialized) {
          console.log('🔄 Reusing GLOBAL cached DataSource');
          return globalCache.__typeorm_global_cache__.dataSource;
        }

        console.log('🆕 Creating new GLOBAL DataSource');
        const ds = new DataSource(options);
        await ds.initialize();
        globalCache.__typeorm_global_cache__.dataSource = ds;
        return ds;
      },
    }),

    AuthModule,
    UsersModule,
    PrModule,
    PoModule,
    WrModule,
    WoModule,
    JobModule,
    TraderModule,
    SupplierModule,
    DepartmentModule,
    DepartModule,
    PattycashModule,
  ],
  // ✅ เพิ่ม Exception Filter
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule { }
