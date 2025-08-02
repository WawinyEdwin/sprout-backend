import { User } from "@supabase/supabase-js";
import { Request } from "express";

export interface RequestWithUser extends Request {
  user: User;
}
