import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountForm, UTAH_VALLEY_SCHOOLS } from "@/components/AccountForm";
import type { User } from "@/lib/store";

describe("AccountForm - Utah Valley School Selection", () => {
  it("exports only BYU and UVU as allowed Utah Valley schools", () => {
    expect(UTAH_VALLEY_SCHOOLS).toEqual(["BYU", "UVU"]);
  });

  it("renders school selection as a drop-down menu with only specified schools", () => {
    render(<AccountForm submitLabel="Create account" onSubmit={() => {}} />);

    const select = screen.getByRole("combobox", { name: /school/i });
    expect(select).toBeInTheDocument();
    expect(select.tagName.toLowerCase()).toBe("select");

    const options = screen.getAllByRole("option");
    // Placeholder + BYU + UVU
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent("Select your school");
    expect(options[1]).toHaveTextContent("BYU");
    expect(options[1]).toHaveValue("BYU");
    expect(options[2]).toHaveTextContent("UVU");
    expect(options[2]).toHaveValue("UVU");
  });

  it("requires school selection before submission can occur", () => {
    render(<AccountForm submitLabel="Create account" onSubmit={() => {}} />);

    const submitBtn = screen.getByRole("button", { name: /create account/i });
    expect(submitBtn).toBeDisabled();

    // Fill in other required fields
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "testuser" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@byu.edu" } });

    // Submit should still be disabled because school is not selected
    expect(submitBtn).toBeDisabled();

    // Select BYU
    fireEvent.change(screen.getByRole("combobox", { name: /school/i }), {
      target: { value: "BYU" },
    });

    expect(submitBtn).not.toBeDisabled();
  });

  it("successfully submits with selected Utah Valley school", () => {
    const handleSubmit = vi.fn();
    render(<AccountForm submitLabel="Create account" onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "cougar1" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "securepass" } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Cosmo Cougar" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "cosmo@byu.edu" } });
    fireEvent.change(screen.getByRole("combobox", { name: /school/i }), {
      target: { value: "BYU" },
    });

    const submitBtn = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "cougar1",
        name: "Cosmo Cougar",
        email: "cosmo@byu.edu",
        school: "BYU",
      })
    );
  });

  it("populates existing school selection when initial user is provided", () => {
    const existingUser: User = {
      username: "wolverine1",
      password: "password123",
      name: "Willy Wolverine",
      email: "willy@uvu.edu",
      school: "UVU",
    };

    render(
      <AccountForm
        initial={existingUser}
        submitLabel="Save changes"
        onSubmit={() => {}}
      />
    );

    const select = screen.getByRole("combobox", { name: /school/i }) as HTMLSelectElement;
    expect(select.value).toBe("UVU");
  });
});
