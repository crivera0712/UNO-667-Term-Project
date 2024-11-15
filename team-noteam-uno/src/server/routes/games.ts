import express from "express";
const router = express.Router();

router.get("/", (_request, response) => {
  response.render("games/index", { title: "Games" });
});

export default router;
