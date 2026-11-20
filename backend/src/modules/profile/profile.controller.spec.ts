import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';
import type { Request } from 'express';
import type { TUserPublic } from '../../common/types/user.js';

describe('ProfileController', () => {
  let controller: ProfileController;
  let getProfileByUserId: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getProfileByUserId = vi.fn();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: { getProfileByUserId } }],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('uses the authenticated user id', async () => {
    const req = { user: { id: 'current-user' } } as Request & { user: TUserPublic };

    await controller.getProfileByUserId(req);

    expect(getProfileByUserId).toHaveBeenCalledWith('current-user');
  });
});
