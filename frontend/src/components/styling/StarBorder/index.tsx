import React from "react";
import "./StarBorder.css";

export interface StarBorderProps {
  as?: React.ElementType;
  className?: string;
  color?: string;
  speed?: string;
  children: React.ReactNode;
  [x: string]: any; // For additional props like onClick
}

const StarBorder: React.FC<StarBorderProps> = ({
  as: Component = "div",
  className = "",
  color = "white",
  speed = "6s",
  children,
  ...rest
}) => {
  // Apply the speed to the animations via inline styles
  const animationStyle = {
    '--animation-speed': speed,
  } as React.CSSProperties;

  return (
    <Component 
      className={`star-border-container ${className}`} 
      style={animationStyle}
      {...rest}
    >
      <div className="inner-content">{children}</div>
      
      {/* We're now using CSS pseudo-elements for the border effect */}
      {/* No need for individual border elements anymore */}
    </Component>
  );
};

export default StarBorder; 