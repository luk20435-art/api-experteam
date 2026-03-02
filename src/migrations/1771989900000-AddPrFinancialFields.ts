import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPrFinancialFields1771989900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('pr');
    if (!table) return;

    const hasCurrency = table.columns.some((c) => c.name === 'currency');
    if (!hasCurrency) {
      await queryRunner.addColumn('pr', new TableColumn({
        name: 'currency',
        type: 'varchar',
        isNullable: true,
      }));
    }

    const hasDiscountType = table.columns.some((c) => c.name === 'discountType');
    if (!hasDiscountType) {
      await queryRunner.addColumn('pr', new TableColumn({
        name: 'discountType',
        type: 'varchar',
        isNullable: true,
      }));
    }

    const hasDiscountValue = table.columns.some((c) => c.name === 'discountValue');
    if (!hasDiscountValue) {
      await queryRunner.addColumn('pr', new TableColumn({
        name: 'discountValue',
        type: 'varchar',
        isNullable: true,
      }));
    }

    if (table.columns.some((c) => c.name === 'withholdingPercent')) {
      await queryRunner.query('UPDATE "pr" SET "withholdingPercent" = 0 WHERE "withholdingPercent" IS NULL');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('pr');
    if (!table) return;

    for (const col of ['discountValue', 'discountType', 'currency']) {
      if (table.columns.some((c) => c.name === col)) {
        await queryRunner.dropColumn('pr', col);
      }
    }
  }
}
