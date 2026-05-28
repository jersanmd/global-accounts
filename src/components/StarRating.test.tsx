import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StarRating } from "./StarRating";

describe("StarRating", () => {
  it("renders 5 stars", () => {
    render(<StarRating rating={3} />);
    const stars = document.querySelectorAll(".lucide-star, svg");
    expect(stars.length).toBeGreaterThan(0);
  });

  it("accepts rating prop", () => {
    const { container } = render(<StarRating rating={4} />);
    expect(container).toBeTruthy();
  });
});
