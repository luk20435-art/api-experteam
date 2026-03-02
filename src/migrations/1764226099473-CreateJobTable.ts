// src/migrations/1762500000001-CreateJobTable.ts

import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateJobTable1762500000001 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'jobs',  // ชื่อตารางตามที่คุณใช้ใน Entity
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'jobName',
            type: 'varchar',
          },
          {
            name: 'projectCode',
            type: 'varchar',
          },
          {
            name: 'jobNo',
            type: 'varchar',
            isUnique: true,  // ควร unique
          },
          {
            name: 'ccNo',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'waNumber',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'wrPoSrRoNumber',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'contactPerson',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'contactNumber',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'contactEmail',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'traderId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'trader',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'expteamQuotation',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'estimatedPrCost',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'startDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'endDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'remark',
            type: 'text',
            isNullable: true,
          },

          // Budget fields
          {
            name: 'budgetMaterial',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'budgetManPower',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'budgetOp',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'budgetIe',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'budgetSupply',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'budgetEngineer',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },

          // Approval Users (เก็บเป็น userId)
          {
            name: 'requesterId',
            type: 'varchar',
          },
          {
            name: 'originatorId',
            type: 'varchar',
          },
          {
            name: 'storeId',
            type: 'varchar',
          },
          {
            name: 'approverId',
            type: 'varchar',
          },

          // Timestamps
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true, // ถ้ามีตารางอยู่แล้วให้ replace (ใช้เฉพาะตอน dev)
    );

    // เพิ่ม index เพื่อค้นหาเร็ว
    await queryRunner.query(`CREATE INDEX idx_job_jobno ON jobs("jobNo")`);
    await queryRunner.query(`CREATE INDEX idx_job_requester ON jobs("requesterId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('jobs', 'idx_job_jobno');
    await queryRunner.dropIndex('jobs', 'idx_job_requester');
    await queryRunner.dropTable('jobs');
  }
}