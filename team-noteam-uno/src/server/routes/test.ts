import express from "express";
const router = express.Router();

router.get("/", (_request, response) => {
  response.render("test/index", { title: "Test Page" });
});

export default router;
