import type { Store } from "./types";
import { NativeNetMeter } from "./native";
import { replaceStore } from "./storage";

type BackupEnvelope = { format: "netmeter-backup"; version: 1; createdAt: string; store: Store };
function validatePassword(password: string) { if (password.trim().length < 8) throw new Error("استخدم كلمة مرور من 8 أحرف على الأقل لحماية النسخة الاحتياطية."); }
function moduleOrThrow() { if (!NativeNetMeter) throw new Error("يتطلب النسخ المشفر بناء Android مخصصًا؛ لا يعمل داخل نسخة المعاينة."); return NativeNetMeter; }
export async function createEncryptedBackup(store: Store, password: string) { validatePassword(password); const envelope: BackupEnvelope = { format: "netmeter-backup", version: 1, createdAt: new Date().toISOString(), store }; return moduleOrThrow().encryptBackup(JSON.stringify(envelope), password); }
export async function restoreEncryptedBackup(ciphertext: string, password: string) { validatePassword(password); const raw = await moduleOrThrow().decryptBackup(ciphertext.trim(), password); const envelope = JSON.parse(raw) as Partial<BackupEnvelope>; if (envelope.format !== "netmeter-backup" || envelope.version !== 1 || !envelope.store) throw new Error("ملف النسخة الاحتياطية غير متوافق مع NetMeter."); return replaceStore(envelope.store); }
