import { config } from "dotenv";
import path from "path";

// Load environment variables from .env file
config({
  path: path.resolve(__dirname, "../../../.env")
});
