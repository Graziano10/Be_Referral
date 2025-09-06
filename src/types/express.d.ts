// NON importare nulla qui: tenerlo come global ambient declaration

// declare namespace Express {
//   interface Request {
//     auth?: {
//       profileId: string;
//       email?: string;
//       sub?: string;
//       role?: string[];
//       raw?: any;
//     };
//     profile?: {
//       _id: any; // o Types.ObjectId se preferisci
//       email: string;
//       firstName?: string;
//       lastName?: string;
//       verified?: boolean;
//     };
//   }
// }
// src/types/express.d.ts
// src/types/express.d.ts
import "express";

declare global {
  namespace Express {
    interface UserTokenPayload {
      sub?: string;
      profileId: string;
      email?: string;
      role?: string[];
      iat?: number;
      exp?: number;
    }
    interface Request {
      auth?: {
        profileId: string;
        email?: string;
        sub?: string;
        role?: string[];
        raw?: any;
      };
      profile?: Pick<
        import("../database/types").TProfileSchema,
        "_id" | "email" | "firstName" | "lastName" | "verified"
      >;
    }
  }
}

export {};
