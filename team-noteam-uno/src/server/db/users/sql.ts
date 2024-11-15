export const REGISTER_SQL = `
  INSERT INTO users (username, email, password, gravatar)
  VALUES ($1, $2, $3, $4)
  RETURNING id, username, email, gravatar
`;
