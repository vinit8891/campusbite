import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MenuItemForm from "@/components/restaurant/MenuItemForm";
import * as menuService from "@/services/menuService";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/authTokens", () => ({
  getRestaurantOwnerEmail: () => "owner@campus.edu",
}));

describe("MenuItemForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dual image input toggle buttons and form inputs", () => {
    render(<MenuItemForm mode="add" />);

    expect(screen.getByPlaceholderText("Food Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Description")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Price")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Pizza, Burger, etc.")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /upload file/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /image url/i })
    ).toBeInTheDocument();
  });

  it("allows entering image URL when Image URL mode is active", async () => {
    const user = userEvent.setup();
    render(<MenuItemForm mode="add" />);

    const urlModeBtn = screen.getByRole("button", { name: /image url/i });
    await user.click(urlModeBtn);

    const urlInput = screen.getByPlaceholderText(/https:\/\/images\.example\.com/i);
    await user.type(urlInput, "https://example.com/paneer.jpg");

    expect(urlInput).toHaveValue("https://example.com/paneer.jpg");
    expect(screen.getByAltText("Menu item preview")).toHaveAttribute(
      "src",
      "https://example.com/paneer.jpg"
    );
  });

  it("handles image file upload, validation, and base64 conversion", async () => {
    const user = userEvent.setup();
    render(<MenuItemForm mode="add" />);

    const file = new File(["dummy image content"], "dish.png", {
      type: "image/png",
    });

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByAltText("Menu item preview")).toBeInTheDocument();
      expect(screen.getByText("File Upload")).toBeInTheDocument();
    });
  });

  it("rejects image files larger than 2MB", () => {
    render(<MenuItemForm mode="add" />);

    const largeBlob = new Blob([new Uint8Array(3 * 1024 * 1024)], {
      type: "image/png",
    });
    const largeFile = new File([largeBlob], "large-dish.png", {
      type: "image/png",
    });

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(
      screen.getByText(/Image file is too large\. Maximum allowed size is 2MB/i)
    ).toBeInTheDocument();
  });

  it("rejects unsupported file formats", () => {
    render(<MenuItemForm mode="add" />);

    const textFile = new File(["not an image"], "document.pdf", {
      type: "application/pdf",
    });

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [textFile] } });

    expect(
      screen.getByText(/Invalid file format\. Please upload a JPEG, PNG, or WebP image/i)
    ).toBeInTheDocument();
  });

  it("allows removing image using the Remove button", async () => {
    const user = userEvent.setup();
    render(
      <MenuItemForm
        mode="edit"
        itemId="item-123"
        initialValues={{
          name: "Veg Burger",
          description: "Crispy patty",
          price: "99",
          category: "Burger",
          image: "https://example.com/burger.jpg",
          available: true,
        }}
      />
    );

    expect(screen.getByAltText("Menu item preview")).toBeInTheDocument();

    const removeBtn = screen.getByRole("button", { name: /remove/i });
    await user.click(removeBtn);

    expect(screen.queryByAltText("Menu item preview")).not.toBeInTheDocument();
  });

  it("submits the form with all fields including uploaded image", async () => {
    const user = userEvent.setup();
    const addMenuItemSpy = vi
      .spyOn(menuService, "addMenuItem")
      .mockResolvedValueOnce({
        message: "Item added successfully",
        id: "new-dish-1",
      });

    render(<MenuItemForm mode="add" />);

    await user.type(screen.getByPlaceholderText("Food Name"), "Veg Momos");
    await user.type(
      screen.getByPlaceholderText("Description"),
      "Steamed dumplings"
    );
    await user.type(screen.getByPlaceholderText("Price"), "80");
    await user.type(screen.getByPlaceholderText("Pizza, Burger, etc."), "Chinese");

    const urlModeBtn = screen.getByRole("button", { name: /image url/i });
    await user.click(urlModeBtn);
    await user.type(
      screen.getByPlaceholderText(/https:\/\/images\.example\.com/i),
      "https://example.com/momos.jpg"
    );

    const submitBtn = screen.getByRole("button", { name: /save food/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(addMenuItemSpy).toHaveBeenCalledWith({
        restaurant_email: "owner@campus.edu",
        name: "Veg Momos",
        description: "Steamed dumplings",
        price: 80,
        category: "Chinese",
        image: "https://example.com/momos.jpg",
        available: true,
      });
      expect(mockPush).toHaveBeenCalledWith("/restaurant/dashboard/menu");
    });
  });
});
