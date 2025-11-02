/**
 * Settings Module für Script Coordinator
 *
 * Refactored aus public/scripts/settings.js um Event-Listener-Konflikte zu eliminieren.
 * Lädt nur auf Settings-Seiten und integriert sich in das Script-Koordinations-System.
 */

import coordinator, { SCRIPT_PRIORITIES } from '@/lib/script-coordinator';

type SettingsHandlerContext = {
  profileFormCleanup?: () => void;
  passwordFormCleanup?: () => void;
  avatarUploadCleanup?: () => void;
};
import notify from '@/lib/notify';

// Settings-Module Registration
coordinator.register({
  id: 'settings-page-handlers',
  priority: SCRIPT_PRIORITIES.LOW, // Settings haben niedrige Priorität
  pageFilter: (pathname: string) => {
    // Nur auf Settings-Seiten laden
    return (
      pathname.includes('/settings') ||
      pathname.includes('/profile') ||
      pathname.includes('/account')
    );
  },
  init: async function (this: SettingsHandlerContext) {
    console.log('[Settings] Initializing settings page handlers');
    // Notifications are handled via typed Sonner wrapper (see '@/lib/notify')

    // URL-Status-Handling (Success/Error) + Cleanup
    (function handleStatusParams() {
      try {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        const success = params.get('success');
        const error = params.get('error');
        if (!success && !error) return;

        const isEnglish = window.location.pathname.startsWith('/en');

        if (success) {
          const message = isEnglish
            ? success === 'PasswordChanged'
              ? 'Password updated successfully.'
              : 'Action completed successfully.'
            : success === 'PasswordChanged'
              ? 'Passwort wurde erfolgreich aktualisiert.'
              : 'Aktion erfolgreich abgeschlossen.';
          notify.success(message);
        } else if (error) {
          const code = error;
          const message = isEnglish
            ? `Action failed (${code}).`
            : `Aktion fehlgeschlagen (${code}).`;
          notify.error(message);
        }

        // Entferne Status-Parameter und bereinige die URL
        params.delete('success');
        params.delete('error');
        const newQuery = params.toString();
        const newUrl = url.pathname + (newQuery ? `?${newQuery}` : '') + url.hash;
        window.history.replaceState({}, document.title, newUrl);
      } catch (e) {
        console.error('[Settings] URL status handling failed:', e);
      }
    })();

    // Profile Form Handler
    function handleProfileForm(this: SettingsHandlerContext) {
      const form = document.getElementById('profile-form') as HTMLFormElement;
      if (!form) {
        console.log('[Settings] Profile form not found - skipping');
        return;
      }

      const submitHandler = async (e: Event) => {
        e.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        const originalButtonText = submitButton?.textContent || '';

        try {
          // Show loading state
          if (submitButton) {
            submitButton.textContent = 'Saving...';
            submitButton.disabled = true;
          }

          const formData = new FormData(form);

          // Remove avatar field from profile update if it exists
          if (formData.has('avatar')) {
            formData.delete('avatar');
          }

          const response = await fetch('/api/user/profile', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            notify.success('Profile updated successfully!');
          } else {
            const errorText = await response.text();
            notify.error(`Error: ${errorText}`);
          }
        } catch (error) {
          console.error('[Settings] Profile update error:', error);
          notify.error(
            `Update failed: ${error instanceof Error ? error.message : 'Network error'}`
          );
        } finally {
          // Reset button state
          if (submitButton) {
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
          }
        }
      };

      form.addEventListener('submit', submitHandler);

      // Store cleanup function
      this.profileFormCleanup = () => {
        form.removeEventListener('submit', submitHandler);
      };
    }

    // Password Strength Checker
    function checkPasswordStrength(password: string): string {
      if (password.length < 8) return 'Too short (minimum 8 characters)';
      if (!/[A-Z]/.test(password)) return 'Add uppercase letter';
      if (!/[a-z]/.test(password)) return 'Add lowercase letter';
      if (!/[0-9]/.test(password)) return 'Add number';
      if (!/[^A-Za-z0-9]/.test(password)) return 'Add special character';
      return 'Strong password';
    }

    // Password Form Handler
    function handlePasswordForm(this: SettingsHandlerContext) {
      const form = document.getElementById('password-form') as HTMLFormElement;
      const strengthIndicator = document.getElementById('password-strength');
      const errorsContainer = document.getElementById('password-errors') as HTMLElement | null;
      const newPasswordInput = document.getElementById('new-password') as HTMLInputElement;

      if (!form) {
        console.log('[Settings] Password form not found - skipping');
        return;
      }

      let strengthHandler: ((e: Event) => void) | null = null;
      let submitHandler: ((e: Event) => void) | null = null;

      // Password strength checking
      if (newPasswordInput && strengthIndicator) {
        strengthHandler = (e: Event) => {
          const target = e.target as HTMLInputElement;
          const strength = checkPasswordStrength(target.value);
          (strengthIndicator as HTMLElement).textContent = strength;

          // Add color coding
          if (strength === 'Strong password') {
            (strengthIndicator as HTMLElement).className = 'text-green-600';
          } else {
            (strengthIndicator as HTMLElement).className = 'text-yellow-600';
          }
        };

        newPasswordInput.addEventListener('input', strengthHandler);
      }

      // Form submission
      submitHandler = async (e: Event) => {
        e.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        const originalButtonText = submitButton?.textContent || '';

        try {
          if (submitButton) {
            submitButton.textContent = 'Updating...';
            submitButton.disabled = true;
          }

          // Clear previous errors
          if (errorsContainer) errorsContainer.textContent = '';

          // Collect and validate inputs
          const formData = new FormData(form);
          const current = (formData.get('current-password') || '') as string;
          const next = (formData.get('new-password') || '') as string;
          const confirm = (formData.get('confirm-password') || '') as string;

          if (!next || !current) {
            const msg = 'Please fill in all required fields';
            if (errorsContainer) errorsContainer.textContent = msg;
            notify.error(msg);
            return;
          }

          if (next !== confirm) {
            const msg = 'Passwords do not match';
            if (errorsContainer) errorsContainer.textContent = msg;
            notify.error(msg);
            return;
          }

          // Build payload matching API expectations of /api/user/password
          const payload = new FormData();
          payload.set('current-password', current);
          payload.set('new-password', next);

          const response = await fetch('/api/user/password', {
            method: 'POST',
            body: payload,
          });

          if (response.ok) {
            notify.success('Password updated successfully!');
            form.reset();
            if (strengthIndicator) (strengthIndicator as HTMLElement).textContent = '';
            if (errorsContainer) errorsContainer.textContent = '';
          } else {
            const errorText = await response.text();
            if (errorsContainer) errorsContainer.textContent = errorText || 'Update failed';
            notify.error(`Error: ${errorText}`);
          }
        } catch (error) {
          console.error('[Settings] Password update error:', error);
          notify.error(
            `Update failed: ${error instanceof Error ? error.message : 'Network error'}`
          );
        } finally {
          if (submitButton) {
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
          }
        }
      };

      form.addEventListener('submit', submitHandler);

      // Store cleanup functions
      this.passwordFormCleanup = () => {
        if (submitHandler) form.removeEventListener('submit', submitHandler);
        if (strengthHandler && newPasswordInput) {
          newPasswordInput.removeEventListener('input', strengthHandler);
        }
      };
    }

    // Avatar Upload Handler
    function handleAvatarUpload(this: SettingsHandlerContext) {
      const uploadElement = document.getElementById('avatar-upload') as HTMLInputElement;
      const changeButton = document.getElementById('change-avatar-btn') as HTMLButtonElement;

      if (!uploadElement || !changeButton) {
        console.log('[Settings] Avatar upload elements not found - skipping');
        return;
      }

      let clickHandler: ((e: Event) => void) | null = null;
      let changeHandler: ((e: Event) => void) | null = null;

      // Trigger file input when button is clicked
      clickHandler = () => {
        uploadElement.click();
      };
      changeButton.addEventListener('click', clickHandler);

      // Handle file selection
      changeHandler = async (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        // Show loading indicator
        notify.info('Uploading avatar...');
        changeButton.textContent = 'Uploading...';
        changeButton.disabled = true;

        const file = input.files[0];
        const formData = new FormData();
        formData.append('avatar', file);

        try {
          const response = await fetch('/api/user/avatar', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const dataUnknown: unknown = await response.json().catch(() => null);
            const avatarPreview = document.getElementById('avatar-preview') as HTMLImageElement;
            if (
              dataUnknown &&
              typeof dataUnknown === 'object' &&
              'imageUrl' in dataUnknown &&
              typeof (dataUnknown as { imageUrl?: unknown }).imageUrl === 'string'
            ) {
              if (avatarPreview) {
                avatarPreview.src = (dataUnknown as { imageUrl: string }).imageUrl;
              }
              notify.success('Avatar updated successfully!');
            } else {
              notify.error('Unexpected response while updating avatar.');
            }
          } else {
            const errorText = await response.text();
            notify.error(`Error: ${errorText}`);
          }
        } catch (error) {
          console.error('[Settings] Avatar upload error:', error);
          notify.error(
            `Upload failed: ${error instanceof Error ? error.message : 'Network error'}`
          );
        } finally {
          // Reset button state
          changeButton.textContent = 'Change Picture';
          changeButton.disabled = false;
        }
      };

      uploadElement.addEventListener('change', changeHandler);

      // Store cleanup functions
      this.avatarUploadCleanup = () => {
        if (clickHandler) changeButton.removeEventListener('click', clickHandler);
        if (changeHandler) uploadElement.removeEventListener('change', changeHandler);
      };
    }

    // Initialize all handlers
    handleProfileForm.call(this);
    handlePasswordForm.call(this);
    handleAvatarUpload.call(this);

    console.log('[Settings] All settings handlers initialized successfully');
  },

  cleanup: function (this: SettingsHandlerContext) {
    // Call all stored cleanup functions
    if (this.profileFormCleanup) {
      this.profileFormCleanup();
    }
    if (this.passwordFormCleanup) {
      this.passwordFormCleanup();
    }
    if (this.avatarUploadCleanup) {
      this.avatarUploadCleanup();
    }

    console.log('[Settings] Settings handlers cleaned up');
  },
});

export default coordinator;
