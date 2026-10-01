import { describe, it, expect } from "vitest";
import { detectPersonalDetails, redactPersonalDetails } from "./personalDetails";

const SAMPLE_CV = `Priya Krishnan
Product Manager
+91 98442 31075 · priya.krishnan@example.com · Mumbai · linkedin.com/in/priyakrishnan-pm

PROFESSIONAL SUMMARY
Product Manager with 4 years of experience in logistics operations and freight-tech SaaS.

WORK EXPERIENCE
Product Manager
Portzen Technologies Pvt. Ltd., Mumbai · Mar 2022 - Present
- Shipped 7 features in 14 months.

EDUCATION
B.Com (Hons.), Jai Hind College, University of Mumbai
`;

describe("detectPersonalDetails", () => {
  it("finds name, email, and phone from a properly line-broken CV", () => {
    const result = detectPersonalDetails(SAMPLE_CV);
    expect(result.name).toBe("Priya Krishnan");
    expect(result.email).toBe("priya.krishnan@example.com");
    expect(result.phone).toContain("98442");
  });

  it("finds short names (2-character parts like initials)", () => {
    const text = "Bo Li\nbo.li@example.com\n+91 99009 55312\n";
    const result = detectPersonalDetails(text);
    expect(result.name).toBe("Bo Li");
  });

  it("returns an empty name when nothing on the first few lines looks like one", () => {
    const text = "no name line here at all\njust some text\nmore text\n";
    const result = detectPersonalDetails(text);
    expect(result.name).toBe("");
  });
});

describe("redactPersonalDetails", () => {
  it("removes the confirmed name, email, and phone", () => {
    const detected = { name: "Priya Krishnan", email: "priya.krishnan@example.com", phone: "+91 98442 31075" };
    const redacted = redactPersonalDetails(SAMPLE_CV, detected);
    expect(redacted).not.toContain("Priya Krishnan");
    expect(redacted).not.toContain("priya.krishnan@example.com");
    expect(redacted).not.toContain("98442 31075");
  });

  it("redacts a mention of just the first name elsewhere in the text", () => {
    const text = "Priya Krishnan\npriya.krishnan@example.com\n\nSigned, Priya\n";
    const redacted = redactPersonalDetails(text, {
      name: "Priya Krishnan",
      email: "priya.krishnan@example.com",
      phone: "",
    });
    expect(redacted).not.toMatch(/\bPriya\b/);
  });

  it("does not leave a stray '+' before a redacted phone number", () => {
    const text = "Name\n+91 98765 43210\n";
    const redacted = redactPersonalDetails(text, { name: "Name", email: "", phone: "+91 98765 43210" });
    expect(redacted).not.toContain("+[candidate phone]");
  });

  /**
   * Regression test for a real privacy bug: only the confirmed email/phone
   * were being stripped, so a CV listing a second email or phone (e.g. a
   * reference's contact info) leaked straight through to the AI. Blanket
   * redaction now catches any email/phone-shaped string, not just the
   * confirmed one.
   */
  it("blanket-redacts a second, unconfirmed email and phone number", () => {
    const text = [
      "Priya Krishnan",
      "priya.krishnan@example.com",
      "+91 98442 31075",
      "",
      "References",
      "Contact my manager at manager.ref@company.com or call (022) 4567-8901.",
    ].join("\n");

    const redacted = redactPersonalDetails(text, {
      name: "Priya Krishnan",
      email: "priya.krishnan@example.com",
      phone: "+91 98442 31075",
    });

    expect(redacted).not.toContain("manager.ref@company.com");
    expect(redacted).not.toContain("4567-8901");
  });

  it("is a no-op when nothing was detected", () => {
    const text = "Some CV text with no identifiers.";
    expect(redactPersonalDetails(text, { name: "", email: "", phone: "" })).toBe(text);
  });
});
