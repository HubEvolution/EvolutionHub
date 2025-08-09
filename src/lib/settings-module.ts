/**
 * Settings Module für Script Coordinator
 * 
 * Refactored aus public/scripts/settings.js um Event-Listener-Konflikte zu eliminieren.
 * Lädt nur auf Settings-Seiten und integriert sich in das Script-Koordinations-System.
 */

import coordinator, { SCRIPT_PRIORITIES } from '@/lib/script-coordinator';

// Settings-Module Registration
coordinator.register({
  id: 'settings-page-handlers',
  priority: SCRIPT_PRIORITIES.LOW, // Settings haben niedrige Priorität
  pageFilter: (pathname: string) => {
    // Nur auf Settings-Seiten laden
    return pathname.includes('/settings') || pathname.includes('/profile') || pathname.includes('/account');
  },
  init: async function() {
    console.log('[Settings] Initializing settings page handlers');
    
    // Toastr dynamisch laden (falls verfügbar)
    let toastr: any = null;
    try {
      // @ts-ignore - Toastr könnte global verfügbar sein
      toastr = window.toastr || null;
    } catch (e) {
      console.warn('[Settings] Toastr not available, using console for notifications');
    }
    
    // Fallback notification function
    const notify = {
      success: (msg: string) => toastr ? toastr.success(msg) : console.log('SUCCESS:', msg),
      error: (msg: string) => toastr ? toastr.error(msg) : console.error('ERROR:', msg),
      info: (msg: string) => toastr ? toastr.info(msg) : console.info('INFO:', msg)
    };
    
    // Profile Form Handler
    function handleProfileForm() {
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
          notify.error(`Update failed: ${error instanceof Error ? error.message : 'Network error'}`);
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
      (this as any).profileFormCleanup = () => {
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
    function handlePasswordForm() {
      const form = document.getElementById('password-form') as HTMLFormElement;
      const strengthIndicator = document.getElementById('password-strength');
      const newPasswordInput = document.getElementById('new_password') as HTMLInputElement;
      
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
          strengthIndicator.textContent = strength;
          
          // Add color coding
          if (strength === 'Strong password') {
            strengthIndicator.className = 'text-green-600';
          } else {
            strengthIndicator.className = 'text-yellow-600';
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
          
          const formData = new FormData(form);
          const response = await fetch('/api/user/password', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            notify.success('Password updated successfully!');
            form.reset();
            if (strengthIndicator) strengthIndicator.textContent = '';
          } else {
            const errorText = await response.text();
            notify.error(`Error: ${errorText}`);
          }
        } catch (error) {
          console.error('[Settings] Password update error:', error);
          notify.error(`Update failed: ${error instanceof Error ? error.message : 'Network error'}`);
        } finally {
          if (submitButton) {
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
          }
        }
      };
      
      form.addEventListener('submit', submitHandler);
      
      // Store cleanup functions
      (this as any).passwordFormCleanup = () => {
        if (submitHandler) form.removeEventListener('submit', submitHandler);
        if (strengthHandler && newPasswordInput) {
          newPasswordInput.removeEventListener('input', strengthHandler);
        }
      };
    }
    
    // Avatar Upload Handler
    function handleAvatarUpload() {
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
            const data = await response.json();
            const avatarPreview = document.getElementById('avatar-preview') as HTMLImageElement;
            if (avatarPreview) {
              avatarPreview.src = data.imageUrl;
            }
            notify.success('Avatar updated successfully!');
          } else {
            const errorText = await response.text();
            notify.error(`Error: ${errorText}`);
          }
        } catch (error) {
          console.error('[Settings] Avatar upload error:', error);
          notify.error(`Upload failed: ${error instanceof Error ? error.message : 'Network error'}`);
        } finally {
          // Reset button state
          changeButton.textContent = 'Change Picture';
          changeButton.disabled = false;
        }
      };
      
      uploadElement.addEventListener('change', changeHandler);
      
      // Store cleanup functions
      (this as any).avatarUploadCleanup = () => {
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
  
  cleanup: function() {
    // Call all stored cleanup functions
    if ((this as any).profileFormCleanup) {
      (this as any).profileFormCleanup();
    }
    if ((this as any).passwordFormCleanup) {
      (this as any).passwordFormCleanup();
    }
    if ((this as any).avatarUploadCleanup) {
      (this as any).avatarUploadCleanup();
    }
    
    console.log('[Settings] Settings handlers cleaned up');
  }
});

export default coordinator;
