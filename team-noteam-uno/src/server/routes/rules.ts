import express from "express";
const router = express.Router();

router.get("/", (_request, response) => {
    response.render("rules", { title: "UNO Rules" });
});

export default router;
