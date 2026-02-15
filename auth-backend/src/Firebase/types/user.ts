export interface UserProfile {
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: Date;
}
