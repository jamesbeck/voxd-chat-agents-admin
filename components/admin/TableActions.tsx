"use client";

import { Fragment, ReactElement, ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import Alert from "@/components/admin/Alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TableActionButton = {
  label?: string;
  icon?: ReactNode;
  variant?: "default" | "outline" | "destructive" | "ghost";
  tooltip?: string;
  href?: string;
  target?: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  confirm?: {
    title: string;
    description: string;
    actionText: string;
    destructive?: boolean;
    onAction: () => void;
  };
};

type ShorthandProps = {
  /** Simple single-link shorthand — renders one button */
  href: string;
  label?: string;
  target?: string;
  buttons?: never;
  custom?: never;
};

type MultiProps = {
  /** Array of action buttons */
  buttons: TableActionButton[];
  /** Escape hatch: arbitrary ReactNode rendered before the buttons */
  custom?: ReactNode;
  href?: never;
  label?: never;
  target?: never;
};

export type TableActionsProps = ShorthandProps | MultiProps;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withTooltip({
  element,
  tooltip,
  disabled,
}: {
  element: ReactElement;
  tooltip?: string;
  disabled?: boolean;
}) {
  if (!tooltip) return element;

  const trigger = disabled ? (
    <span className="inline-flex">{element}</span>
  ) : (
    element
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function renderButton(btn: TableActionButton, key: number) {
  if (btn.hidden) return null;

  const hasLabel = !!btn.label;
  const size = hasLabel ? "xs" : "icon-xs";
  const variant = btn.variant ?? "outline";

  const content = (
    <>
      {btn.loading ? <Spinner /> : btn.icon}
      {btn.label}
    </>
  );

  let el: ReactNode;
  const isDisabled = !!(btn.disabled || btn.loading);

  if (btn.href) {
    const button = (
      <Button
        key={key}
        variant={variant}
        size={size}
        disabled={btn.disabled}
        asChild
      >
        <Link
          href={btn.href}
          target={btn.target}
          rel={btn.target === "_blank" ? "noopener noreferrer" : undefined}
        >
          {content}
        </Link>
      </Button>
    );

    el = withTooltip({
      element: button,
      tooltip: btn.tooltip,
      disabled: !!btn.disabled,
    });
  } else {
    const button = (
      <Button
        key={key}
        variant={variant}
        size={size}
        disabled={isDisabled}
        onClick={btn.confirm ? undefined : btn.onClick}
      >
        {content}
      </Button>
    );

    el = btn.confirm
      ? button
      : withTooltip({
          element: button,
          tooltip: btn.tooltip,
          disabled: isDisabled,
        });
  }

  if (btn.confirm) {
    el = (
      <Alert
        key={key}
        title={btn.confirm.title}
        description={btn.confirm.description}
        actionText={btn.confirm.actionText}
        destructive={btn.confirm.destructive}
        onAction={btn.confirm.onAction}
      >
        {el as ReactElement}
      </Alert>
    );
  }

  return <Fragment key={key}>{el}</Fragment>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TableActions(props: TableActionsProps) {
  // Shorthand: single link button
  if ("href" in props && props.href) {
    return (
      <Button variant="outline" size="xs" asChild>
        <Link
          href={props.href}
          target={props.target}
          rel={
            props.target === "_blank" ? "noopener noreferrer" : undefined
          }
        >
          {props.label ?? "View"}
        </Link>
      </Button>
    );
  }

  // Multi-button mode
  const { buttons, custom } = props as MultiProps;
  const visible = buttons.filter((b) => !b.hidden);

  if (!custom && visible.length === 0) return null;

  if (!custom && visible.length === 1) {
    return <>{renderButton(visible[0], 0)}</>;
  }

  return (
    <div className="flex items-center gap-1.5">
      {custom}
      {visible.map((btn, i) => renderButton(btn, i))}
    </div>
  );
}
