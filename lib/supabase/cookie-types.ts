/** Shared narrow cookie update shape compatible with Next.js 15 and Supabase SSR. */
export type CookieUpdate={
 name:string;value:string;
 options?:{
  path?:string;domain?:string;expires?:Date;maxAge?:number;
  httpOnly?:boolean;secure?:boolean;sameSite?:boolean|"lax"|"strict"|"none";
  priority?:"low"|"medium"|"high";partitioned?:boolean;
 }
};
