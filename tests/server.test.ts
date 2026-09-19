import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../server/app";

describe("classification API", () => {
  it("rejects malformed transcript windows", async () => {
    const classifier = vi.fn();
    const response = await request(createApp(classifier))
      .post("/classify")
      .send({ text: "too short", windowId: 1 });

    expect(response.status).toBe(400);
    expect(classifier).not.toHaveBeenCalled();
  });

  it("returns structured classification without echoing the transcript", async () => {
    const classifier = vi.fn().mockResolvedValue({
      boring: true,
      confidence: 0.82,
      reason: "Repeated topic with minimal engagement",
      suggestedPreset: "boss",
    });
    const text =
      "We have discussed the same weather story several times and neither person is adding anything new.";
    const response = await request(createApp(classifier))
      .post("/classify")
      .send({ text, windowId: 7 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      windowId: 7,
      boring: true,
      confidence: 0.82,
      reason: "Repeated topic with minimal engagement",
      suggestedPreset: "boss",
    });
    expect(JSON.stringify(response.body)).not.toContain(text);
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("does not expose provider errors", async () => {
    const classifier = vi.fn().mockRejectedValue(new Error("secret failure"));
    const response = await request(createApp(classifier))
      .post("/classify")
      .send({
        text: "This is a sufficiently long transcript window for the request schema to accept.",
        windowId: 2,
      });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: "Classification is temporarily unavailable",
    });
  });
});
