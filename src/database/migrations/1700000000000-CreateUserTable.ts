import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUserTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'firstName',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'lastName',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'phoneNumber',
            type: 'varchar',
            length: '15',
            isNullable: true,
          },
          {
            name: 'password',
            type: 'varchar',
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
            default: "'VIEWER'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'],
            default: "'PENDING'",
          },
          {
            name: 'isEmailVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'lastLoginAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'refreshToken',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'resetPasswordToken',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'resetPasswordExpires',
            type: 'timestamp',
            isNullable: true,
          },
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
            name: 'createdBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updatedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USER_EMAIL',
        columnNames: ['email'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USER_ROLE',
        columnNames: ['role'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USER_STATUS',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'IDX_USER_STATUS');
    await queryRunner.dropIndex('users', 'IDX_USER_ROLE');
    await queryRunner.dropIndex('users', 'IDX_USER_EMAIL');
    await queryRunner.dropTable('users');
  }
}
