import React, { createRef } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordField from '@/components/ui/PasswordField';

describe('PasswordField component', () => {
  it('renders with password type by default and shows label', () => {
    render(<PasswordField label="User Password" placeholder="Enter password" />);

    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByText('User Password')).toBeInTheDocument();
  });

  it('toggles password visibility when the eye button is clicked', async () => {
    const user = userEvent.setup();
    render(<PasswordField placeholder="Enter password" />);

    const input = screen.getByPlaceholderText('Enter password');
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    expect(input).toHaveAttribute('type', 'password');
    expect(toggleButton).toHaveAttribute('aria-label', 'Show password');

    // Click to show password
    await user.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');
    expect(toggleButton).toHaveAttribute('aria-label', 'Hide password');

    // Click to hide password again
    await user.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
    expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
  });

  it('renders error message when error prop is provided', () => {
    render(
      <PasswordField
        label="Password"
        error="Password must be at least 6 characters"
      />
    );

    const errorMsg = screen.getByRole('alert');
    expect(errorMsg).toHaveTextContent('Password must be at least 6 characters');
  });

  it('associates label htmlFor with input id correctly', () => {
    render(<PasswordField label="Secret Key" id="custom-secret-key" />);

    const label = screen.getByText('Secret Key');
    const input = screen.getByLabelText('Secret Key');

    expect(label).toHaveAttribute('for', 'custom-secret-key');
    expect(input).toHaveAttribute('id', 'custom-secret-key');
  });

  it('forwards ref correctly to the input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<PasswordField ref={ref} placeholder="Ref test" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.placeholder).toBe('Ref test');
  });
});
