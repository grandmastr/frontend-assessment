import React from 'react';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({
  children,
  asChild = false,
}) => {
  const Component = asChild ? React.Fragment : 'span';

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      className: `${children.props.className || ''} visually-hidden`.trim(),
    });
  }

  return <Component className="visually-hidden">{children}</Component>;
};
