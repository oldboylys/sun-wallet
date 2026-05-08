import { z } from "zod";

export const passwordSchema = z.string().min(8, "密码长度至少 8 位");

export const mnemonicSchema = z
  .string()
  .trim()
  .regex(/^\S+(?:\s+\S+){11,23}$/, "助记词格式不正确");

export const privateKeySchema = z
  .string()
  .trim()
  .regex(/^(0x)?[0-9a-fA-F]{64}$/, "私钥格式不正确");
