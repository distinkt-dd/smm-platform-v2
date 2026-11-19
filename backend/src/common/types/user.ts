export type TUserPublic = {
  id: string;
  email: string;
  createdAt: Date;
};

export type TUserResponse = {
  accessToken: string;
  user: TUserPublic;
}

export type TUserPrivate = TUserPublic & { password: string };

export type TUserForRelation = {
  email: string;
  hashPassword: string;
};
