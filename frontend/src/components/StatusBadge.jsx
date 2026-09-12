import React from "react";
import { Clock, PlayCircle, CheckCircle2, Archive, FileText } from "lucide-react";
import { getStatusProps } from "../utils/priority";

export default function StatusBadge({ status, size = "md" }) {
  const props = getStatusProps(status);

  let Icon = FileText;
  if (status === "NEW") Icon = Clock;
  else if (status === "ASSIGNED") Icon = FileText;
  else if (status === "IN_PROGRESS") Icon = PlayCircle;
  else if (status === "RESOLVED") Icon = CheckCircle2;
  else if (status === "CLOSED") Icon = Archive;

  const sizeClasses = size === "sm" 
    ? "text-xs px-2 py-0.5 gap-1" 
    : "text-xs px-2.5 py-1 gap-1.5 font-medium";

  return (
    <span className={`inline-flex items-center rounded-md border ${props.bgColor} ${props.borderColor} ${props.color} ${sizeClasses}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {props.label}
    </span>
  );
}
