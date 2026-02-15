import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth , db } from "../Firebase";
import { doc, setDoc } from "firebase/firestore";
import { UserProfile } from "../types/user";

export const registerUser = async (
  name: string,
  email: string,
  password: string
): Promise<void> => {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);

  const userData: UserProfile = {
    name,
    email,
    role: "user",
    createdAt: new Date(),
  };

  await setDoc(doc(db, "users", userCred.user.uid), userData);
};
