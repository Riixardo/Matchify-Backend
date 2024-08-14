import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import { Pool } from 'pg';

const fs = require('fs');
const path = require('path');

// Use __dirname to get the current directory of the script
const filePath = path.join(__dirname, 'database_schema.sql');
const resetTablesQuery = fs.readFileSync(filePath, 'utf8');

describe('DatabaseService (Integration)', () => {
  let service: DatabaseService;
  let pool: Pool;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    await pool.query(resetTablesQuery);
  });

  afterAll(async () => {
    await pool.end();
  });
  
  it('should add the users', async () => {
    await service.addUserInfo('a', 'user1', 'frank', 'george', 'detriot', new Date(), 'loves chicken', 'nice@gmail.com', '/best_girl.jpg', 'playlist1', "gay");
    const result1 = await pool.query('SELECT * FROM users WHERE user_id = $1 AND gender = $2', ['a', 'gay']);
    expect(result1.rows.length).toBe(1);
    await service.addUserInfo('b', 'user1', 'bob', 'george', 'detriot', new Date(), 'loves chicken', 'nice@gmail.com', '/best_girl.jpg','playlist1', "gay");
    const result2 = await pool.query('SELECT * FROM users WHERE user_id = $1', ['b']);
    expect(result2.rows.length).toBe(1);
  });
});