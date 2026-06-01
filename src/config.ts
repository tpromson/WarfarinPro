export const config = {
  doctorPasscode: import.meta.env.VITE_DOCTOR_PASSCODE || "10949",
} as const;

export type Config = typeof config;
