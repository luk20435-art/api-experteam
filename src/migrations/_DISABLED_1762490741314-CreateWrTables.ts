import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from 'typeorm';

export class CreateWrJobApprovalTables1762490741314 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================== WR table ====================
    await queryRunner.createTable(
      new Table({
        name: 'wr',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'wrNumber', type: 'varchar', isUnique: true },
          { name: 'title', type: 'varchar' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', default: "'draft'" },
          { name: 'requestedById', type: 'integer', isNullable: true },
          { name: 'departmentId', type: 'integer', isNullable: true },
          { name: 'createdById', type: 'integer', isNullable: true },
          { name: 'updatedById', type: 'integer', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deletedAt', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    // ==================== WR Approval table ====================
    await queryRunner.createTable(
      new Table({
        name: 'wr_approval',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'wrId', type: 'integer', isNullable: false },
          { name: 'approverId', type: 'integer', isNullable: false },
          { name: 'level', type: 'integer', isNullable: true },
          { name: 'status', type: 'varchar', default: "'pending'" },
          { name: 'comment', type: 'text', isNullable: true },
          { name: 'approvedAt', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    // Foreign Key: wr_approval → wr
    await queryRunner.createForeignKey(
      'wr_approval',
      new TableForeignKey({
        name: 'FK_wr_approval_wrId',
        columnNames: ['wrId'],
        referencedTableName: 'wr',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ==================== PR Item prId FK ====================
    const prItemTable = await queryRunner.getTable('pr_item');
    if (prItemTable) {
      // add prId column if not exist
      const hasPrId = prItemTable.columns.some(col => col.name === 'prId');
      if (!hasPrId) {
        await queryRunner.addColumn(
          'pr_item',
          new TableColumn({
            name: 'prId',
            type: 'integer',
            isNullable: false,
          }),
        );
      }

      // add FK if not exist
      const hasFk = prItemTable.foreignKeys.some(fk => fk.columnNames.includes('prId'));
      if (!hasFk) {
        await queryRunner.createForeignKey(
          'pr_item',
          new TableForeignKey({
            name: 'FK_pr_item_prId',
            columnNames: ['prId'],
            referencedTableName: 'pr',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ==================== Drop Foreign Keys ====================
    const wrApprovalTable = await queryRunner.getTable('wr_approval');
    if (wrApprovalTable) {
      const fk = wrApprovalTable.foreignKeys.find(f => f.columnNames.includes('wrId'));
      if (fk) await queryRunner.dropForeignKey('wr_approval', fk);
    }

    const prItemTable = await queryRunner.getTable('pr_item');
    if (prItemTable) {
      const fk = prItemTable.foreignKeys.find(f => f.columnNames.includes('prId'));
      if (fk) await queryRunner.dropForeignKey('pr_item', fk);

      const prIdCol = prItemTable.columns.find(c => c.name === 'prId');
      if (prIdCol) await queryRunner.dropColumn('pr_item', 'prId');
    }

    // ==================== Drop Tables ====================
    await queryRunner.dropTable('wr_approval', true);
    await queryRunner.dropTable('wr', true);
  }
}
