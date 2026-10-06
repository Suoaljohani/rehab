/** Isolates an English UI path inside Arabic text so bidi ordering stays readable. */
const ltr = (t: string) => `\u2066${t}\u2069`;

/** Twilio Verify / Supabase Auth error codes → what the admin should do (Arabic). */
export const TWILIO_FIX: Record<string, string> = {
  "21608": `حساب ${ltr("Twilio")} تجريبي أو بلا «ملف امتثال أساسي» معتمد، فلا يرسل إلا للأرقام الموثّقة. للتجربة: أضف رقمك في ${ltr("Phone Numbers › Verified Caller IDs")}. للتشغيل الفعلي: رقِّ الحساب (${ltr("Upgrade")}) وأكمل ${ltr("Trust Hub › Primary Customer Profile")}.`,
  "60605": `السعودية محجوبة في إعدادات ${ltr("Twilio Verify")}. فعّلها من ${ltr("Verify › Settings › Geo permissions")}.`,
  "20003": `بيانات ${ltr("Twilio")} في ${ltr("Supabase")} غير صحيحة (${ltr("Account SID")} أو ${ltr("Auth Token")}). صحّحها في ${ltr("Authentication › Sign In / Providers › Phone")}.`,
  "20404": `معرّف خدمة ${ltr("Twilio Verify")} (${ltr("Verify Service SID")}) غير صحيح في ${ltr("Supabase")}.`,
  "60200": `رقم الجوال غير صالح لدى ${ltr("Twilio")}. تحقق من رقم المراجع.`,
  "60203": `تجاوز المراجع عدد محاولات الإرسال المسموح بها في ${ltr("Twilio")}. ينتظر ١٠ دقائق.`,
  "60410": `حظر ${ltr("Twilio")} هذا الرقم مؤقتًا للاشتباه بالاحتيال. راجع ${ltr("Verify › Fraud Guard")}.`,
  "21211": `صيغة رقم الجوال غير صحيحة لدى ${ltr("Twilio")}.`,
  "21612": `لا يمكن إرسال رسائل إلى هذا الرقم من ${ltr("Twilio")} حاليًا.`,
  "68008": `قناة واتساب غير مهيأة في ${ltr("Twilio Verify")}. فعّلها من ${ltr("Verify › Services › WhatsApp")} أو اربط حساب واتساب للأعمال.`,
  "60223": `قناة الإرسال معطّلة في خدمة ${ltr("Twilio Verify")}. فعّل ${ltr("WhatsApp")} و${ltr("SMS")} في إعدادات الخدمة.`,
  "63016": `انتهت نافذة المحادثة في واتساب. يلزم قالب رسائل معتمد في ${ltr("Twilio")}.`,
  "63003": `الرقم غير مسجّل في واتساب. سيُرسل الرمز برسالة نصية إن كان الاحتياط مفعّلًا.`,
};

export const SMS_ERROR: Record<string, string> = {
  sms_send_failed: "رفض مزوّد الرسائل الإرسال.",
  otp_disabled: "رقم الجوال غير مربوط بحساب دخول المراجع.",
  over_sms_send_rate_limit: `تجاوز حد الإرسال في ${ltr("Supabase")}. ارفعه من ${ltr("Authentication › Rate Limits")}.`,
  gateway_not_configured: "اتصال قاعدة البيانات بخدمة الدخول غير مُعد.",
  network: "تعذّر الوصول إلى خدمة الدخول.",
  auth_phone_mismatch: "رقم الجوال مستخدم في حساب آخر — صحّحه من ملف المراجع.",
};

export function smsFailureText(errorCode?: string | null, providerCode?: string | null) {
  if (providerCode && TWILIO_FIX[providerCode]) return TWILIO_FIX[providerCode];
  return SMS_ERROR[errorCode ?? ""] ?? `رمز الخطأ: ${providerCode ?? errorCode ?? "غير معروف"}`;
}
