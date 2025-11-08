import React, { forwardRef } from 'react';

import {
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  type ButtonSize,
  type ButtonVariant,
} from './buttonStyles';

type BaseButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
};

type ButtonAsButtonProps = BaseButtonProps & {
  as?: 'button';
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

type ButtonAsAnchorProps = BaseButtonProps & {
  as: 'a';
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

type ButtonProps = ButtonAsButtonProps | ButtonAsAnchorProps;

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      className = '',
      isLoading = false,
      fullWidth = false,
      as = 'button',
      children,
      ...rest
    },
    ref
  ) {
    const widthClass = fullWidth ? 'w-full' : '';
    const classes = [
      BUTTON_BASE,
      BUTTON_SIZES[size],
      BUTTON_VARIANTS[variant],
      widthClass,
      className,
      isLoading ? 'pointer-events-none opacity-75' : '',
    ]
      .filter(Boolean)
      .join(' ');

    if (as === 'a') {
      const anchorProps = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={classes}
          aria-busy={isLoading || undefined}
          {...anchorProps}
        >
          {children}
        </a>
      );
    }

    const buttonProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
    const computedDisabled = Boolean(buttonProps.disabled || isLoading);

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={classes}
        disabled={computedDisabled}
        aria-busy={isLoading || undefined}
        {...buttonProps}
      >
        {children}
      </button>
    );
  }
);

export default Button;
