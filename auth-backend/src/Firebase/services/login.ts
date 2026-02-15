import { signInWithEmailAndPassword, UserCredential } from "firebase/auth";
import { auth } from "../Firebase";

export const loginUser = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  return await signInWithEmailAndPassword(auth, email, password);
};
