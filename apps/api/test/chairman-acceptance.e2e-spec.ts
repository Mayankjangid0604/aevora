import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Chairman Acceptance & Emergency Controls (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  // Test Data
  let chairmanToken: string;
  let employeeToken: string;
  let companyId: string;
  let employeeId: string;
  let agentId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Step 3: Chairman Acceptance Test Workflow', () => {
    it('1. Chairman initiates company and employee creation', async () => {
      // NOTE: Assumes Chairman is seeded or created here.
      // This step verifies the Chairman can create a business structure.
      const chairman = await prisma.chairman.findFirst();
      expect(chairman).toBeDefined();

      const companyResponse = await request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${chairmanToken}`)
        .send({ name: 'E2E Acceptance Company' })
        .expect(HttpStatus.CREATED);

      companyId = companyResponse.body.id;
      
      const empResponse = await request(app.getHttpServer())
        .post(`/companies/${companyId}/employees`)
        .set('Authorization', `Bearer ${chairmanToken}`)
        .send({ name: 'Test Operator', role: 'OPERATOR' })
        .expect(HttpStatus.CREATED);
        
      employeeId = empResponse.body.id;
      
      // Check Audit Log
      const audit = await prisma.companyEvent.findFirst({
        where: { companyId, type: 'EMPLOYEE_HIRED' }
      });
      expect(audit).toBeDefined();
      expect(audit.payload['actor']).toEqual('Chairman');
    });

    it('2. Employee spawns AI Agent and Task', async () => {
      // Authenticate as employee
      // ...
      // Spawn Agent
      const agentResponse = await request(app.getHttpServer())
        .post(`/companies/${companyId}/agents`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ employeeId })
        .expect(HttpStatus.CREATED);
        
      agentId = agentResponse.body.id;
    });

    it('3. AI Agent drafts a Project Proposal', async () => {
      // ... Agent uses API to draft proposal
    });

    it('4. Chairman approves the Proposal', async () => {
      // ... Chairman approval
    });
  });

  describe('Step 4: Emergency Controls Verification', () => {
    it('1. Kill switch ON blocks operation and records audit', async () => {
      // Activate Kill Switch
      await request(app.getHttpServer())
        .post(`/companies/${companyId}/emergency/kill-switch`)
        .set('Authorization', `Bearer ${chairmanToken}`)
        .send({ active: true })
        .expect(HttpStatus.OK);
        
      // Attempt action
      await request(app.getHttpServer())
        .post(`/companies/${companyId}/projects`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Forbidden Project' })
        .expect(HttpStatus.FORBIDDEN);
        
      // Check Audit Log for block
      const audit = await prisma.companyEvent.findFirst({
        where: { companyId, type: 'OPERATION_BLOCKED_KILLSWITCH' }
      });
      expect(audit).toBeDefined();
    });

    it('2. Kill switch OFF resumes operation', async () => {
      // Deactivate Kill Switch
      await request(app.getHttpServer())
        .post(`/companies/${companyId}/emergency/kill-switch`)
        .set('Authorization', `Bearer ${chairmanToken}`)
        .send({ active: false })
        .expect(HttpStatus.OK);
        
      // Attempt action again
      await request(app.getHttpServer())
        .post(`/companies/${companyId}/projects`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Allowed Project' })
        .expect(HttpStatus.CREATED);
    });

    it('3. Inactive employee operation is rejected', async () => {
      // Deactivate employee
      await prisma.employee.update({
        where: { id: employeeId },
        data: { status: 'SUSPENDED' } // Example status
      });
      
      // Attempt action
      await request(app.getHttpServer())
        .post(`/companies/${companyId}/tasks`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ title: 'Rogue Task' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('4. Unauthorized AI action is rejected', async () => {
      // Attempt action out of AI scope
      await request(app.getHttpServer())
        .delete(`/companies/${companyId}`)
        .set('Authorization', `Bearer ${employeeToken}`) // Simulating agent token
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
