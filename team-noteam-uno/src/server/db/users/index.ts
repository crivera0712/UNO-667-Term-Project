import { createHash } from "crypto";
import db from "../connection";
import bcrypt from "bcrypt";

interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  gravatar: string;
  created_at: Date;
}

const register = async (
  username: string,
  email: string,
  clearTextPassword: string
): Promise<User> => {
  const password = await bcrypt.hash(clearTextPassword, 10);
  const gravatar = createHash("sha256").update(email).digest("hex");

  return await db.one<User>(
    "INSERT INTO users (username, email, password, gravatar) VALUES ($1, $2, $3, $4) RETURNING *",
    [username, email, password, gravatar]
  );
};

const findByEmail = (email: string) =>
  db.oneOrNone<User>("SELECT * FROM users WHERE email=$1", [email]);

const findById = (id: number) =>
  db.oneOrNone<User>("SELECT * FROM users WHERE id=$1", [id]);

export default { register, findByEmail, findById };
