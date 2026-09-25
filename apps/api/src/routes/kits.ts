import { Router } from "express";
import mongoose from "mongoose";
import { Kit } from "../models/Kit";
import { runPipeline } from "../services/pipeline/runPipeline";

const router = Router();

// POST /api/kits - Start kit generation
router.post("/", async (req, res) => {
  try {
    const { jd, company_url, days } = req.body;
    
    if (!jd || !days) {
      return res.status(400).json({ error: "Missing required fields: jd, days." });
    }

    // Temporarily generate a dummy user ID until the auth module is wired in
    const dummyUserId = new mongoose.Types.ObjectId();

    // 1. Create a pending record in the database
    const kit = new Kit({
      userId: dummyUserId,
      status: "pending",
      progress: { step: "pending", pct: 0, message: "Initializing pipeline..." }
    });
    await kit.save();

    // 2. Fire and forget the pipeline (runs in background)
    runPipeline(
      { jd, company_url, days },
      async (progress) => {
        // Update the database progress so the frontend loading bar can read it
        await Kit.findByIdAndUpdate(kit._id, {
          status: progress.step === "completed" ? "ready" : "generating",
          progress: progress
        });
      }
    ).then(async (validatedKit) => {
      // 3a. On Success: Save the exact Appendix A structure
      await Kit.findByIdAndUpdate(kit._id, {
        status: "ready",
        source: validatedKit.source,
        company_brief: validatedKit.company_brief,
        role: validatedKit.role,
        questions: validatedKit.questions,
        flashcards: validatedKit.flashcards,
        schedule: validatedKit.schedule,
        coverage: validatedKit.coverage,
        progress: { step: "completed", pct: 100, message: "Kit is ready!" }
      });
    }).catch(async (error: any) => {
      // 3b. On Error: Mark as failed so the frontend can show a retry button
      await Kit.findByIdAndUpdate(kit._id, {
        status: "failed",
        error: error.message || "An error occurred during generation.",
        progress: { step: "failed", pct: 0, message: "Generation failed." }
      });
    });

    // 4. Immediately return the ID to the frontend
    res.status(202).json({ kitId: kit._id, message: "Generation started." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/kits/:id - Polling endpoint for the frontend
router.get("/:id", async (req, res) => {
  try {
    const kit = await Kit.findById(req.params.id);
    if (!kit) return res.status(404).json({ error: "Kit not found." });
    
    res.json(kit);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;