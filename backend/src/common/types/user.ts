export type TUserPublic = {
  id: string;
  email: string;
  createdAt: Date;
};

export type TUserForRelation = {
  email: string;
  hashPassword: string;
};
