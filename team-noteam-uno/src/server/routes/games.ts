import express from "express";
const router = express.Router();

router.get("/", (_request, response) => {
  response.render("gameLobby", { title: "Game Lobby" });
});

export default router;
