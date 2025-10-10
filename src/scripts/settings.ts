// src/scripts/settings.ts
// ESM-kompatible Import-Syntax
import notify from '@/lib/notify';

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  error: { message: string };
};

type ApiResponse<T> = ApiSuccess<T> | ApiError;

type AvatarResponse = {
  imageUrl: string;
};

const parseJsonResponse = async <T>(response: Response): Promise<ApiResponse<T> | null> => {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.toLowerCase().includes('application/json')) {
    return null;
  }
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    return null;
  }
};

const setButtonState = (button: HTMLButtonElement, label: string, disabled: boolean): void => {
  button.textContent = label;
  button.disabled = disabled;
};

export const handleProfileForm = () => {
  const formElement = document.getElementById('profile-form');
  if (!(formElement instanceof HTMLFormElement)) return;

  const submitButton = formElement.querySelector('button[type="submit"]');
  if (!(submitButton instanceof HTMLButtonElement)) return;

  const originalButtonText = submitButton.textContent ?? 'Save';

  // Ensure the form doesn't submit normally
  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      // Show loading state
      setButtonState(submitButton, 'Saving...', true);

      const formData = new FormData(formElement);

      // Remove avatar field from profile update if it exists (handled separately)
      if (formData.has('avatar')) {
        formData.delete('avatar');
      }

      const response = await fetch('/api/user/profile', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });

      if (response.ok) {
        notify.success('Profile updated successfully!');
        return;
      }

      const errorText = await response.text();
      notify.error(`Error: ${errorText}`);
    } catch (error: unknown) {
      console.error('Profile update error:', error);
      const message = error instanceof Error ? error.message : 'Network error';
      notify.error(`Update failed: ${message}`);
    } finally {
      // Reset button state
      setButtonState(submitButton, originalButtonText, false);
    }
  });
};

const checkPasswordStrength = (password: string): { score: number; text: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let text = '';
  switch (score) {
    case 0:
    case 1:
    case 2:
      text = 'Weak';
      break;
    case 3:
      text = 'Medium';
      break;
    case 4:
    case 5:
      text = 'Strong';
      break;
  }
  return { score, text };
};

export const handlePasswordForm = () => {
  const formElement = document.getElementById('password-form');
  if (!(formElement instanceof HTMLFormElement)) return;

  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const strengthIndicator = document.getElementById('password-strength');
  const errorContainer = document.getElementById('password-errors');

  if (newPasswordInput instanceof HTMLInputElement && strengthIndicator) {
    newPasswordInput.addEventListener('input', () => {
      const { text } = checkPasswordStrength(newPasswordInput.value);
      strengthIndicator.textContent = `Password Strength: ${text}`;
    });
  }

  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (errorContainer) errorContainer.textContent = '';

    if (!(newPasswordInput instanceof HTMLInputElement)) {
      notify.error('Password field is missing');
      return;
    }

    if (!(confirmPasswordInput instanceof HTMLInputElement)) {
      notify.error('Confirm password field is missing');
      return;
    }

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const { score } = checkPasswordStrength(newPassword);

    if (newPassword !== confirmPassword) {
      if (errorContainer) errorContainer.textContent = 'Passwords do not match.';
      return;
    }

    if (score < 3) {
      if (errorContainer) {
        errorContainer.textContent = 'Password is too weak. Please use a stronger password.';
      }
      return;
    }

    const formData = new FormData(formElement);

    try {
      const response = await fetch('/api/user/password', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });

      if (response.ok) {
        notify.success('Password updated successfully!');
        formElement.reset();
        if (strengthIndicator) strengthIndicator.textContent = '';
        return;
      }

      const errorText = await response.text();
      notify.error(`Error: ${errorText}`);
    } catch (error: unknown) {
      console.error('Password update error:', error);
      const message = error instanceof Error ? error.message : 'Network error';
      notify.error(`Update failed: ${message}`);
    }
  });
};

export const handleAvatarUpload = () => {
  const uploadElement = document.getElementById('avatar-upload');
  const changeButton = document.getElementById('change-avatar-btn');
  const previewElement = document.getElementById('avatar-preview');
  if (!(uploadElement instanceof HTMLInputElement)) return;
  if (!(changeButton instanceof HTMLButtonElement)) return;
  if (previewElement && !(previewElement instanceof HTMLImageElement)) return;

  // Trigger file input when the button is clicked
  changeButton.addEventListener('click', () => {
    uploadElement.click();
  });

  uploadElement.addEventListener('change', async (event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    // Show loading indicator
    notify.info('Uploading avatar...');
    setButtonState(changeButton, 'Uploading...', true);

    const file = input.files[0];
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorText = await response.text();
        notify.error(`Error: ${errorText}`);
        return;
      }

      const parsed = await parseJsonResponse<AvatarResponse>(response);
      const imageUrl = parsed?.success ? parsed.data.imageUrl : null;

      if (imageUrl && previewElement instanceof HTMLImageElement) {
        previewElement.src = imageUrl;
        notify.success('Avatar updated successfully!');
      } else {
        notify.error('Unexpected response from server while updating avatar');
      }
    } catch (error: unknown) {
      console.error('Avatar upload error:', error);
      const message = error instanceof Error ? error.message : 'Network error';
      notify.error(`Upload failed: ${message}`);
    } finally {
      // Reset button state
      setButtonState(changeButton, 'Change Picture', false);
    }
  });
};

export const initSettingsPage = () => {
  handleProfileForm();
  handlePasswordForm();
  handleAvatarUpload();
};

// Sichere Initialisierung
document.addEventListener('DOMContentLoaded', initSettingsPage);

// Sofortige Initialisierung, falls DOM bereits geladen ist
if (document.readyState === 'loading') {
  // DOM noch am Laden, Event-Listener wird ausgeführt
} else {
  // DOM bereits geladen, führe initSettingsPage sofort aus
  initSettingsPage();
}
