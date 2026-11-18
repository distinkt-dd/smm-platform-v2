export type TUserPublic = {
  id: string;
  email: string;
  createdAt: Date;
};

export type TUserPrivate = TUserPublic & { password: string };

export type TUserForRelation = {
  email: string;
  hashPassword: string;
};
