import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { DeleteUserModal } from "@/components/admin/DeleteUserModal";

describe("DeleteUserModal component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <DeleteUserModal
        isOpen={false}
        userName="Rahul Sharma"
        userEmail="rahul@campus.in"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders user details and warning message when isOpen is true", () => {
    render(
      <DeleteUserModal
        isOpen={true}
        userName="Rahul Sharma"
        userEmail="rahul@campus.in"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Confirm User Deletion")).toBeInTheDocument();
    expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
    expect(screen.getByText(/rahul@campus\.in/i)).toBeInTheDocument();
    expect(screen.getByText(/action cannot be undone/i)).toBeInTheDocument();
  });

  it("triggers onConfirm when Confirm Delete is clicked", () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <DeleteUserModal
        isOpen={true}
        userName="Rahul Sharma"
        userEmail="rahul@campus.in"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleCancel).not.toHaveBeenCalled();
  });

  it("triggers onCancel when Cancel is clicked", () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <DeleteUserModal
        isOpen={true}
        userName="Rahul Sharma"
        userEmail="rahul@campus.in"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(handleCancel).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it("disables buttons and displays loading text when loading is true", () => {
    render(
      <DeleteUserModal
        isOpen={true}
        userName="Rahul Sharma"
        userEmail="rahul@campus.in"
        loading={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Deleting...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deleting/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
  });
});
