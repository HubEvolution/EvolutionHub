// src/scripts/settings.ts
// ESM-kompatible Import-Syntax
import toastr from 'toastr';

export const handleProfileForm = () => {
  const form = document.getElementById('profile-form') as HTMLFormElement;
  if (!form) return;

  // Ensure the form doesn't submit normally
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const originalButtonText = submitButton.textContent;
    
    try {
      // Show loading state
      submitButton.textContent = 'Saving...';
      submitButton.disabled = true;
      
      const formData = new FormData(form);
      
      // Remove avatar field from profile update if it exists
      // (avatar is handled separately)
      if (formData.has('avatar')) {
        formData.delete('avatar');
      }
      
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toastr.success('Profile updated successfully!');
      } else {
        const errorText = await response.text();
        toastr.error(`Error: ${errorText}`);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toastr.error(`Update failed: ${error.message || 'Network error'}`);
    } finally {
      // Reset button state
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
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
  const form = document.getElementById('password-form') as HTMLFormElement;
  if (!form) return;

  const newPasswordInput = document.getElementById('new-password') as HTMLInputElement;
  const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement;
  const strengthIndicator = document.getElementById('password-strength');
  const errorContainer = document.getElementById('password-errors');

  if (newPasswordInput && strengthIndicator) {
    newPasswordInput.addEventListener('input', () => {
      const { text } = checkPasswordStrength(newPasswordInput.value);
      strengthIndicator.textContent = `Password Strength: ${text}`;
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorContainer.textContent = '';

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const { score } = checkPasswordStrength(newPassword);

    if (newPassword !== confirmPassword) {
      errorContainer.textContent = 'Passwords do not match.';
      return;
    }

    if (score < 3) {
      errorContainer.textContent = 'Password is too weak. Please use a stronger password.';
      return;
    }

    const formData = new FormData(form);
    
    const response = await fetch('/api/user/password', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      toastr.success('Password updated successfully!');
      form.reset();
      if (strengthIndicator) strengthIndicator.textContent = '';
    } else {
      const errorText = await response.text();
      toastr.error(`Error: ${errorText}`);
    }
  });
};

export const handleAvatarUpload = () => {
  const uploadElement = document.getElementById('avatar-upload');
  const changeButton = document.getElementById('change-avatar-btn');
  if (!uploadElement || !changeButton) return;

  // Trigger file input when the button is clicked
  changeButton.addEventListener('click', () => {
    uploadElement.click();
  });

  uploadElement.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    
    // Show loading indicator
    toastr.info('Uploading avatar...');
    changeButton.textContent = 'Uploading...';
    changeButton.setAttribute('disabled', 'true');
    
    const file = input.files[0];
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        (document.getElementById('avatar-preview') as HTMLImageElement).src = data.imageUrl;
        toastr.success('Avatar updated successfully!');
      } else {
        const errorText = await response.text();
        toastr.error(`Error: ${errorText}`);
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      toastr.error(`Upload failed: ${error.message || 'Network error'}`);
    } finally {
      // Reset button state
      changeButton.textContent = 'Change Picture';
      changeButton.removeAttribute('disabled');
    }
  });
};

export const initSettingsPage = () => {
  handleProfileForm();
  handlePasswordForm();
  handleAvatarUpload();
};

// Initial load
initSettingsPage();

// Handle Astro's View Transitions
document.addEventListener('astro:page-load', initSettingsPage);