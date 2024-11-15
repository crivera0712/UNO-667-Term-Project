import express from "express";
const router = express.Router();

router.get("/", (_request, response) => {
    response.render("messagetest", { title: "Chat Test" });
});

export default router;
