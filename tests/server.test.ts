import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../server/app";
import { TwilioCallError } from "../server/interruptions";

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

  it("places a call to the phone number supplied by the app", async () => {
    const classifier = vi.fn();
    const phoneCaller = vi.fn().mockResolvedValue("CA123");
    const response = await request(createApp(classifier, phoneCaller))
      .post("/call")
      .send({ callType: "mom", phoneNumber: "+14155552671" });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ ok: true });
    expect(phoneCaller).toHaveBeenCalledWith("mom", "+14155552671");
  });

  it("rejects missing or invalid phone numbers and unsupported call types", async () => {
    const classifier = vi.fn();
    const phoneCaller = vi.fn();
    const missingNumber = await request(createApp(classifier, phoneCaller))
      .post("/call")
      .send({ callType: "mom" });
    const badType = await request(createApp(classifier, phoneCaller))
      .post("/call")
      .send({ callType: "other", phoneNumber: "+14155552671" });
    const badNumber = await request(createApp(classifier, phoneCaller))
      .post("/call")
      .send({ callType: "mom", phoneNumber: "4155552671" });

    expect(missingNumber.status).toBe(400);
    expect(badType.status).toBe(400);
    expect(badNumber.status).toBe(400);
    expect(phoneCaller).not.toHaveBeenCalled();
  });

  it("returns a safe Twilio error code without provider details", async () => {
    const classifier = vi.fn();
    const phoneCaller = vi
      .fn()
      .mockRejectedValue(new TwilioCallError(400, 21211, "private details"));
    const response = await request(createApp(classifier, phoneCaller))
      .post("/call")
      .send({ callType: "mom", phoneNumber: "+14155552671" });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: "Twilio rejected the phone call",
      code: 21211,
    });
    expect(JSON.stringify(response.body)).not.toContain("private details");
  });
});
