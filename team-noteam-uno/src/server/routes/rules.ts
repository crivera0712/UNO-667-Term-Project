import express from "express";
const router = express.Router();

router.get("/", (_req, res) => {
    res.render("rules");
});

export default router;
