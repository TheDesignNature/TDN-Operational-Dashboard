import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  children,
  className,
  hover = false,
  padding = "md",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-card shadow-card border border-sand/40",
        hover && "transition-shadow duration-200 hover:shadow-card-hover cursor-pointer",
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
