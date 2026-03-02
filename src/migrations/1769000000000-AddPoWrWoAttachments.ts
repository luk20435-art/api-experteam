import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPoWrWoAttachments1769000000000 implements MigrationInterface {
  name = 'AddPoWrWoAttachments1769000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "po_attachments" (
        "id" SERIAL NOT NULL,
        "fileName" character varying NOT NULL,
        "originalFileName" character varying NOT NULL,
        "filePath" character varying NOT NULL,
        "mimeType" character varying NOT NULL,
        "fileSize" bigint NOT NULL,
        "uploadedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "poId" integer,
        CONSTRAINT "PK_po_attachments_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_po_attachments_po'
        ) THEN
          ALTER TABLE "po_attachments"
          ADD CONSTRAINT "FK_po_attachments_po"
          FOREIGN KEY ("poId") REFERENCES "po"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wr_attachments" (
        "id" SERIAL NOT NULL,
        "fileName" character varying NOT NULL,
        "originalFileName" character varying NOT NULL,
        "filePath" character varying NOT NULL,
        "mimeType" character varying NOT NULL,
        "fileSize" bigint NOT NULL,
        "uploadedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "wrId" integer,
        CONSTRAINT "PK_wr_attachments_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_wr_attachments_wr'
        ) THEN
          ALTER TABLE "wr_attachments"
          ADD CONSTRAINT "FK_wr_attachments_wr"
          FOREIGN KEY ("wrId") REFERENCES "wr"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wo_attachments" (
        "id" SERIAL NOT NULL,
        "fileName" character varying NOT NULL,
        "originalFileName" character varying NOT NULL,
        "filePath" character varying NOT NULL,
        "mimeType" character varying NOT NULL,
        "fileSize" bigint NOT NULL,
        "uploadedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "woId" integer,
        CONSTRAINT "PK_wo_attachments_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_wo_attachments_wo'
        ) THEN
          ALTER TABLE "wo_attachments"
          ADD CONSTRAINT "FK_wo_attachments_wo"
          FOREIGN KEY ("woId") REFERENCES "wo"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wo_attachments" DROP CONSTRAINT IF EXISTS "FK_wo_attachments_wo"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wo_attachments"`);

    await queryRunner.query(`ALTER TABLE "wr_attachments" DROP CONSTRAINT IF EXISTS "FK_wr_attachments_wr"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wr_attachments"`);

    await queryRunner.query(`ALTER TABLE "po_attachments" DROP CONSTRAINT IF EXISTS "FK_po_attachments_po"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "po_attachments"`);
  }
}
