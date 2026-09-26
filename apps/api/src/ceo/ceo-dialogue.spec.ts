import { BadRequestException } from '@nestjs/common';
import { CeoDialogueService, parseUrgency } from './ceo-dialogue.service';
import { CeoDecisionsService } from './ceo-decisions.service';

function setup(open: { question: string }[] = [], answerCount = 1) {
  const prisma: any = {
    ceoQuestion: {
      findMany: jest.fn(async () => open),
      create: jest.fn(async ({ data }: any) => ({ id: 'q1', askedAt: new Date(), ...data })),
      updateMany: jest.fn(async () => ({ count: answerCount })),
      findFirst: jest.fn(async () => ({ status: 'ANSWERED' })),
      findUniqueOrThrow: jest.fn(async () => ({ id: 'q1', status: 'ANSWERED' })),
    },
    company: { findUniqueOrThrow: jest.fn(async () => ({ chairmanId: 'chair' })) },
  };
  const realtime: any = { broadcastToUser: jest.fn() };
  return { svc: new CeoDialogueService(prisma, realtime), prisma, realtime };
}

describe('CEO ↔ Chairman dialogue', () => {
  it('pushes a new question to the Chairman', async () => {
    const { svc, realtime } = setup();
    const r = await svc.ask('c1', '  Should we target gyms in Jaipur too? ', { reason: 'gyms convert' }, 'HIGH');
    expect('question' in r && r.question.question).toBe('Should we target gyms in Jaipur too?');
    expect(realtime.broadcastToUser).toHaveBeenCalledWith('chair', 'ceo.question', expect.objectContaining({ urgency: 'HIGH' }));
  });

  it('does not repeat a question or pile up more than 3 unanswered', async () => {
    expect(await setup([{ question: 'Same?' }]).svc.ask('c1', 'Same?', {}, 'LOW')).toEqual({ skipped: 'already asked' });
    const full = setup([{ question: 'a' }, { question: 'b' }, { question: 'c' }]);
    expect(await full.svc.ask('c1', 'd?', {}, 'LOW')).toEqual({ skipped: 'already 3 unanswered questions' });
    expect(full.prisma.ceoQuestion.create).not.toHaveBeenCalled();
  });

  it('answers only open questions, once', async () => {
    const { svc, prisma } = setup();
    await svc.answer('c1', 'q1', 'Yes, try Jaipur gyms.');
    expect(prisma.ceoQuestion.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'q1', companyId: 'c1', status: 'OPEN' } }));
    await expect(setup([], 0).svc.answer('c1', 'q1', 'again')).rejects.toThrow('already answered');
    await expect(svc.answer('c1', 'q1', '   ')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('defaults urgency to MEDIUM and routes ESCALATE_TO_CHAIRMAN to a question, not a ManagementDecision', async () => {
    expect(parseUrgency('urgent')).toBe('MEDIUM');
    const prisma: any = { managementDecision: { create: jest.fn() } };
    const dialogue: any = { ask: jest.fn(async () => ({ question: { question: 'Raise prices?' } })) };
    const svc = new CeoDecisionsService(prisma, {} as any, {} as any, {} as any, dialogue);
    const [d] = await svc.apply('c1', 'ceo', [{ type: 'ESCALATE_TO_CHAIRMAN', reason: 'margins thin', parameters: { question: 'Raise prices?', urgency: 'HIGH' } }], true);
    expect(dialogue.ask).toHaveBeenCalledWith('c1', 'Raise prices?', expect.anything(), 'HIGH');
    expect(prisma.managementDecision.create).not.toHaveBeenCalled();
    expect(d).toMatchObject({ outcome: 'ESCALATED', detail: 'Asked you: "Raise prices?"' });
  });
});
